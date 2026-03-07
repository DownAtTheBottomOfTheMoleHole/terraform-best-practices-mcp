import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const generateComplianceSummaryInputSchema = z.object({
  checkovOutput: z.string().min(50).max(200_000).optional(),
  trivyOutput: z.string().min(50).max(200_000).optional(),
  kicsOutput: z.string().min(50).max(200_000).optional(),
  complianceFramework: z.enum(["cis", "pci-dss", "hipaa", "sox", "general"]).default("general")
});

export type GenerateComplianceSummaryInput = z.infer<typeof generateComplianceSummaryInputSchema>;

export const generateComplianceSummaryInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    checkovOutput: {
      type: "string",
      description: "Optional output from checkov scan."
    },
    trivyOutput: {
      type: "string",
      description: "Optional output from trivy scan."
    },
    kicsOutput: {
      type: "string",
      description: "Optional output from kics scan."
    },
    complianceFramework: {
      type: "string",
      enum: ["cis", "pci-dss", "hipaa", "sox", "general"],
      description: "Compliance framework to assess against.",
      default: "general"
    }
  },
  additionalProperties: false
};

interface ComplianceStatus {
  passed: number;
  failed: number;
  skipped: number;
  warnings: number;
}

function extractComplianceMetrics(output?: string): ComplianceStatus {
  if (!output) {
    return { passed: 0, failed: 0, skipped: 0, warnings: 0 };
  }

  const passed = (output.match(/passed|PASSED|check passed/gi) || []).length;
  const failed = (output.match(/failed|FAILED|check failed/gi) || []).length;
  const skipped = (output.match(/skipped|SKIPPED/gi) || []).length;
  const warnings = (output.match(/warning|WARNING|warn/gi) || []).length;

  return { passed, failed, skipped, warnings };
}

function generateComplianceRecommendations(framework: string, totalFailed: number): string[] {
  const recommendations: string[] = [];

  if (totalFailed > 10) {
    recommendations.push(
      `⚠ High number of compliance failures (${totalFailed}); establish a remediation roadmap.`
    );
  }

  switch (framework) {
    case "cis":
      recommendations.push("✓ CIS framework focus: enforce hardened baselines, RBAC, and audit logging.");
      break;
    case "pci-dss":
      recommendations.push("✓ PCI-DSS focus: encrypt cardholder data, restrict access, and maintain audit logs.");
      break;
    case "hipaa":
      recommendations.push("✓ HIPAA focus: encrypt PHI, implement access controls, and maintain compliance evidence.");
      break;
    case "sox":
      recommendations.push("✓ SOX focus: ensure infrastructure changes are tracked, approved, and logged.");
      break;
    default:
      recommendations.push("✓ General compliance: ensure security controls, auditability, and proper access management.");
  }

  recommendations.push("◌ Schedule regular compliance reviews and audits.");
  recommendations.push("◌ Maintain compliance documentation and evidence for auditors.");

  return recommendations;
}

export const generateComplianceSummaryTool: ToolDefinition<GenerateComplianceSummaryInput> = {
  name: "generate_compliance_summary",
  description: "Generate a compliance summary report from multiple security scan outputs.",
  inputSchema: generateComplianceSummaryInputSchema,
  inputSchemaJson: generateComplianceSummaryInputJsonSchema,
  run: async (input) => {
    const checkovMetrics = extractComplianceMetrics(input.checkovOutput);
    const trivyMetrics = extractComplianceMetrics(input.trivyOutput);
    const kicsMetrics = extractComplianceMetrics(input.kicsOutput);

    const totalPassed = checkovMetrics.passed + trivyMetrics.passed + kicsMetrics.passed;
    const totalFailed = checkovMetrics.failed + trivyMetrics.failed + kicsMetrics.failed;
    const totalWarnings = checkovMetrics.warnings + trivyMetrics.warnings + kicsMetrics.warnings;

    const lines: string[] = [
      "# Compliance Summary Report",
      `Framework: ${input.complianceFramework.toUpperCase()}`,
      ""
    ];

    lines.push("## Scan Results Overview", "");
    lines.push(`- **Checks Passed:** ${totalPassed}`);
    lines.push(`- **Checks Failed:** ${totalFailed}`);
    lines.push(`- **Warnings:** ${totalWarnings}`);
    lines.push("");

    if (input.checkovOutput) {
      lines.push(`### Checkov Results`);
      lines.push(`- Passed: ${checkovMetrics.passed} | Failed: ${checkovMetrics.failed}`);
      lines.push("");
    }

    if (input.trivyOutput) {
      lines.push(`### Trivy Results`);
      lines.push(`- Passed: ${trivyMetrics.passed} | Failed: ${trivyMetrics.failed}`);
      lines.push("");
    }

    if (input.kicsOutput) {
      lines.push(`### KICS Results`);
      lines.push(`- Passed: ${kicsMetrics.passed} | Failed: ${kicsMetrics.failed}`);
      lines.push("");
    }

    const complianceScore = totalPassed > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0;
    lines.push("## Compliance Score", "");
    lines.push(`**${complianceScore}%** - ${complianceScore >= 80 ? "Good" : complianceScore >= 60 ? "Fair" : "Needs Improvement"}`);
    lines.push("");

    lines.push("## Recommendations", "");
    const recommendations = generateComplianceRecommendations(input.complianceFramework, totalFailed);
    lines.push(...recommendations);

    return lines.join("\n");
  }
};
