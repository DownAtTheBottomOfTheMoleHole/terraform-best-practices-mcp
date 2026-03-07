import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const analyzeTerraformPerformanceInputSchema = z.object({
  terraformCode: z.string().min(20).max(120_000),
  stateSizeMb: z.number().min(0).max(100_000).optional(),
  workspaceCount: z.number().int().min(1).max(500).optional(),
  providerRateLimitSensitive: z.boolean().default(true)
});

export type AnalyzeTerraformPerformanceInput = z.infer<typeof analyzeTerraformPerformanceInputSchema>;

export const analyzeTerraformPerformanceInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    terraformCode: {
      type: "string",
      description: "Terraform code used for performance-focused heuristics."
    },
    stateSizeMb: {
      type: "number",
      minimum: 0,
      maximum: 100000,
      description: "Optional state size in MB for scale-aware recommendations."
    },
    workspaceCount: {
      type: "integer",
      minimum: 1,
      maximum: 500,
      description: "Optional number of workspaces sharing the same root stack."
    },
    providerRateLimitSensitive: {
      type: "boolean",
      default: true,
      description: "When true, emphasize provider API throttling protections."
    }
  },
  required: ["terraformCode"],
  additionalProperties: false
};

interface PerformanceMetrics {
  resourceCount: number;
  moduleCount: number;
  dataSourceCount: number;
  dependsOnCount: number;
  forEachCount: number;
  countCount: number;
  timeSleepCount: number;
}

function collectMetrics(code: string): PerformanceMetrics {
  return {
    resourceCount: (code.match(/^\s*resource\s+"/gm) || []).length,
    moduleCount: (code.match(/^\s*module\s+"/gm) || []).length,
    dataSourceCount: (code.match(/^\s*data\s+"/gm) || []).length,
    dependsOnCount: (code.match(/depends_on\s*=\s*\[/g) || []).length,
    forEachCount: (code.match(/for_each\s*=/g) || []).length,
    countCount: (code.match(/\bcount\s*=/g) || []).length,
    timeSleepCount: (code.match(/time_sleep/g) || []).length
  };
}

function getScore(metrics: PerformanceMetrics, stateSizeMb?: number, workspaceCount?: number): number {
  let score = 100;

  if (metrics.resourceCount > 120) {
    score -= 20;
  } else if (metrics.resourceCount > 60) {
    score -= 10;
  }

  if (metrics.dataSourceCount > 30) {
    score -= 12;
  }

  if (metrics.dependsOnCount > 20) {
    score -= 12;
  }

  if (metrics.timeSleepCount > 0) {
    score -= 10;
  }

  if (stateSizeMb && stateSizeMb > 80) {
    score -= 15;
  } else if (stateSizeMb && stateSizeMb > 30) {
    score -= 8;
  }

  if (workspaceCount && workspaceCount > 20) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function buildRecommendations(
  metrics: PerformanceMetrics,
  score: number,
  providerRateLimitSensitive: boolean,
  stateSizeMb?: number,
  workspaceCount?: number
): string[] {
  const recommendations: string[] = [];

  if (metrics.resourceCount > 60) {
    recommendations.push("Split large root stacks into smaller domain-focused stacks to reduce plan/apply duration.");
  }

  if (metrics.dataSourceCount > 20) {
    recommendations.push("Reduce repeated data sources by centralizing lookups in locals or dedicated shared modules.");
  }

  if (metrics.dependsOnCount > 15) {
    recommendations.push("Review explicit depends_on usage; remove unnecessary serialization edges.");
  }

  if (metrics.countCount > 0 && metrics.forEachCount > 0) {
    recommendations.push("Prefer for_each over count where stable addressing is needed to reduce churn during updates.");
  }

  if (metrics.timeSleepCount > 0) {
    recommendations.push("Replace time_sleep resources with event or readiness checks to avoid artificial delays.");
  }

  if (providerRateLimitSensitive) {
    recommendations.push("Tune parallelism and batch changes to reduce provider API throttling during applies.");
  }

  if (stateSizeMb && stateSizeMb > 50) {
    recommendations.push("State size is large; consider splitting by environment or service boundary.");
  }

  if (workspaceCount && workspaceCount > 15) {
    recommendations.push("High workspace count detected; consider separate state backends for critical environments.");
  }

  if (score >= 80) {
    recommendations.push("Current structure indicates healthy performance characteristics. Continue monitoring plan times.");
  }

  return recommendations;
}

function getScoreBand(score: number): string {
  if (score >= 80) {
    return "Good";
  }

  if (score >= 60) {
    return "Fair";
  }

  return "Needs Improvement";
}

export const analyzeTerraformPerformanceTool: ToolDefinition<AnalyzeTerraformPerformanceInput> = {
  name: "analyze_terraform_performance",
  description: "Analyze Terraform code for performance risks and optimization opportunities.",
  inputSchema: analyzeTerraformPerformanceInputSchema,
  inputSchemaJson: analyzeTerraformPerformanceInputJsonSchema,
  run: async (input) => {
    const metrics = collectMetrics(input.terraformCode);
    const score = getScore(metrics, input.stateSizeMb, input.workspaceCount);
    const recommendations = buildRecommendations(
      metrics,
      score,
      input.providerRateLimitSensitive,
      input.stateSizeMb,
      input.workspaceCount
    );

    const lines: string[] = [
      "# Terraform Performance Analysis",
      "",
      "## Metrics",
      "",
      `- Resources: ${metrics.resourceCount}`,
      `- Modules: ${metrics.moduleCount}`,
      `- Data sources: ${metrics.dataSourceCount}`,
      `- Explicit depends_on blocks: ${metrics.dependsOnCount}`,
      `- for_each usage: ${metrics.forEachCount}`,
      `- count usage: ${metrics.countCount}`,
      `- time_sleep usage: ${metrics.timeSleepCount}`
    ];

    if (typeof input.stateSizeMb === "number") {
      lines.push(`- State size (MB): ${input.stateSizeMb}`);
    }

    if (typeof input.workspaceCount === "number") {
      lines.push(`- Workspace count: ${input.workspaceCount}`);
    }

    lines.push(
      "",
      "## Performance Health Score",
      "",
      `**${score}/100** (${getScoreBand(score)})`,
      "",
      "## Recommendations",
      ""
    );

    for (const item of recommendations) {
      lines.push(`- ${item}`);
    }

    return lines.join("\n");
  }
};
