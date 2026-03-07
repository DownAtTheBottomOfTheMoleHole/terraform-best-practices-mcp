import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const generateCostReportInputSchema = z.object({
  infracostJson: z.string().min(50).max(200_000),
  includeOptimizations: z.boolean().default(true)
});

export type GenerateCostReportInput = z.infer<typeof generateCostReportInputSchema>;

export const generateCostReportInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    infracostJson: {
      type: "string",
      description: "JSON output from infracost breakdown or diff command."
    },
    includeOptimizations: {
      type: "boolean",
      description: "When true, generates cost optimization suggestions.",
      default: true
    }
  },
  required: ["infracostJson"],
  additionalProperties: false
};

interface CostData {
  totalMonthly?: number;
  totalMonthlyWithNonsignificant?: number;
  resources?: Array<{
    name: string;
    costDetails?: {
      monthlyQuantityAmount: number;
      monthlyAmount: number;
    };
  }>;
}

function extractCostMetrics(json: string): { totalMonthly: number; resources: Array<{ name: string; cost: number }> } {
  try {
    const data = JSON.parse(json) as CostData;
    const totalMonthly = data.totalMonthly ?? data.totalMonthlyWithNonsignificant ?? 0;
    const resources = (data.resources ?? [])
      .map((r) => ({
        name: r.name,
        cost: r.costDetails?.monthlyAmount ?? 0
      }))
      .filter((r) => r.cost > 0)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    return { totalMonthly, resources };
  } catch {
    return { totalMonthly: 0, resources: [] };
  }
}

function generateOptimizations(resources: Array<{ name: string; cost: number }>): string[] {
  const suggestions: string[] = [];

  if (resources.length === 0) {
    return ["No cost data found to analyze."];
  }

  const topResource = resources[0];
  if (topResource.cost > 1000) {
    suggestions.push(
      `⚠ Top resource '${topResource.name}' costs $${topResource.cost.toFixed(2)}/month; review instance type or consolidate.`
    );
  }

  const storageResources = resources.filter((r) => r.name.toLowerCase().includes("storage"));
  if (storageResources.length > 0 && storageResources[0].cost > 100) {
    suggestions.push("✓ Review storage tiers and retention policies; consider lifecycle rules.");
  }

  const computeResources = resources.filter((r) => r.name.toLowerCase().includes("instance"));
  if (computeResources.length > 5) {
    suggestions.push(
      `✓ Found ${computeResources.length} compute instances; verify all are necessary or consider consolidation.`
    );
  }

  if (resources.length > 1) {
    const top3Sum = resources.slice(0, 3).reduce((sum, r) => sum + r.cost, 0);
    const totalSum = resources.reduce((sum, r) => sum + r.cost, 0);
    const percentOfTotal = ((top3Sum / totalSum) * 100).toFixed(0);
    suggestions.push(`✓ Top 3 resources represent ${percentOfTotal}% of costs; focus optimization efforts here.`);
  }

  return suggestions;
}

export const generateCostReportTool: ToolDefinition<GenerateCostReportInput> = {
  name: "generate_cost_report",
  description: "Generate a comprehensive cost report from infracost output with optimization suggestions.",
  inputSchema: generateCostReportInputSchema,
  inputSchemaJson: generateCostReportInputJsonSchema,
  run: async (input) => {
    const { totalMonthly, resources } = extractCostMetrics(input.infracostJson);

    const lines: string[] = ["# Cost Analysis Report", ""];

    lines.push(`**Estimated Monthly Cost:** $${totalMonthly.toFixed(2)}`, "");

    if (resources.length > 0) {
      lines.push("## Top Resources by Cost", "");
      resources.forEach((r, idx) => {
        lines.push(`${idx + 1}. ${r.name}: $${r.cost.toFixed(2)}/month`);
      });
      lines.push("");
    }

    if (input.includeOptimizations && resources.length > 0) {
      lines.push("## Cost Optimization Opportunities", "");
      const optimizations = generateOptimizations(resources);
      lines.push(...optimizations);
    }

    return lines.join("\n");
  }
};
