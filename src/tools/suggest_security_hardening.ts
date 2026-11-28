import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const suggestSecurityHardeningInputSchema = z.object({
  scanOutput: z.string().min(50).max(200_000),
  scanTool: z.enum(["checkov", "trivy", "kics"]).default("checkov")
});

export type SuggestSecurityHardeningInput = z.infer<typeof suggestSecurityHardeningInputSchema>;

export const suggestSecurityHardeningInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    scanOutput: {
      type: "string",
      description: "Output from a security scanning tool (checkov, trivy, or kics)."
    },
    scanTool: {
      type: "string",
      enum: ["checkov", "trivy", "kics"],
      description: "Name of the scanning tool that produced the output.",
      default: "checkov"
    }
  },
  required: ["scanOutput"],
  additionalProperties: false
};

function countTrivyFailuresFromJson(scanOutput: string): number {
  try {
    const parsed = JSON.parse(scanOutput) as unknown;
    let failures = 0;
    const queue: unknown[] = [parsed];

    while (queue.length > 0) {
      const current = queue.pop();
      if (!current || typeof current !== "object") {
        continue;
      }
      const entry = current as Record<string, unknown>;

      if (entry.Status === "FAIL") {
        failures += 1;
      }

      for (const value of Object.values(entry)) {
        if (value && typeof value === "object") {
          queue.push(value);
        }
      }
    }

    return failures;
  } catch {
    return 0;
  }
}

function generateHardeningSteps(scanOutput: string, scanTool: SuggestSecurityHardeningInput["scanTool"]): string[] {
  const suggestions: string[] = [];
  const trivyJsonFailures = scanTool === "trivy" ? countTrivyFailuresFromJson(scanOutput) : 0;

  const failCountMatch = scanOutput.match(
    /failed checks?\s*:\s*(\d+)|checks failed\s*:\s*(\d+)|failures?\s*:\s*(\d+)|\bfailed\s*:\s*(\d+)/i
  );
  const textFailCount = failCountMatch
    ? Number.parseInt(failCountMatch.slice(1).find((value) => value !== undefined) ?? "0", 10)
    : (scanOutput.match(/\bFAILED\b|\bfailed\b/g) || []).length;
  const failCount = Math.max(textFailCount, trivyJsonFailures);

  if (failCount > 0) {
    suggestions.push(`⚠ Found ${failCount} failed checks; prioritize by severity level.`);
  }

  if (scanOutput.toLowerCase().includes("encryption")) {
    suggestions.push("✓ Review encryption settings: enable at-rest and in-transit encryption for all sensitive resources.");
  }

  if (scanOutput.toLowerCase().includes("public")) {
    suggestions.push("⚠ Public access detected; ensure only necessary resources are publicly exposed; use security groups/NACLs.");
  }

  if (scanOutput.toLowerCase().includes("logging")) {
    suggestions.push("◌ Enable comprehensive logging and monitoring for audit trails and compliance.");
  }

  if (scanOutput.toLowerCase().includes("access") || scanOutput.toLowerCase().includes("iam")) {
    suggestions.push("✓ Enforce least-privilege IAM policies; use roles and assume patterns instead of long-lived keys.");
  }

  if (scanOutput.toLowerCase().includes("network")) {
    suggestions.push("◌ Implement network segmentation and VPC isolation where applicable.");
  }

  if (scanOutput.toLowerCase().includes("tag")) {
    suggestions.push("◌ Add security tags for compliance tracking and automated enforcement.");
  }

  if (suggestions.length === 0) {
    suggestions.push("✓ No obvious security issues detected; maintain regular scanning and patching cycles.");
  }

  return suggestions;
}

export const suggestSecurityHardeningTool: ToolDefinition<SuggestSecurityHardeningInput> = {
  name: "suggest_security_hardening",
  description: "Analyze security scan output and suggest hardening steps to improve infrastructure security.",
  inputSchema: suggestSecurityHardeningInputSchema,
  inputSchemaJson: suggestSecurityHardeningInputJsonSchema,
  run: async (input) => {
    const steps = generateHardeningSteps(input.scanOutput, input.scanTool);

    const lines: string[] = [
      "# Security Hardening Recommendations",
      `Tool: ${input.scanTool}`,
      ""
    ];

    lines.push("## Recommended Actions", "");
    lines.push(...steps);
    lines.push("", "## Next Steps");
    lines.push("1. Prioritize findings by severity and business impact.");
    lines.push("2. Group related hardening measures into implementation sprints.");
    lines.push("3. Integrate security scanning into CI/CD pipelines for continuous monitoring.");

    return lines.join("\n");
  }
};
