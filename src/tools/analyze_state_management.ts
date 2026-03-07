import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const analyzeStateManagementInputSchema = z.object({
  terraformCode: z.string().min(20).max(120_000),
  teamSize: z.number().int().min(1).max(500).default(6),
  environmentCount: z.number().int().min(1).max(100).default(2),
  currentBackend: z.enum(["auto", "s3", "azurerm", "gcs", "remote", "local", "unknown"]).default("auto"),
  useWorkspaces: z.boolean().default(false)
});

export type AnalyzeStateManagementInput = z.infer<typeof analyzeStateManagementInputSchema>;

export const analyzeStateManagementInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    terraformCode: {
      type: "string",
      description: "Terraform code that includes backend and state-related configuration."
    },
    teamSize: {
      type: "integer",
      minimum: 1,
      maximum: 500,
      default: 6,
      description: "Number of engineers applying Terraform changes."
    },
    environmentCount: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 2,
      description: "Number of environments managed by the Terraform estate."
    },
    currentBackend: {
      type: "string",
      enum: ["auto", "s3", "azurerm", "gcs", "remote", "local", "unknown"],
      default: "auto",
      description: "State backend in use. Use auto to infer from code."
    },
    useWorkspaces: {
      type: "boolean",
      default: false,
      description: "Whether multiple environments are managed through Terraform workspaces."
    }
  },
  required: ["terraformCode"],
  additionalProperties: false
};

type Backend = "s3" | "azurerm" | "gcs" | "remote" | "local" | "unknown";

function inferBackend(terraformCode: string): Backend {
  const backendMatch = terraformCode.match(/backend\s+"([a-z0-9_-]+)"/i);
  if (!backendMatch) {
    return "unknown";
  }

  const value = backendMatch[1].toLowerCase();
  if (value === "s3" || value === "azurerm" || value === "gcs" || value === "remote" || value === "local") {
    return value;
  }

  return "unknown";
}

function getRiskLevel(
  backend: Backend,
  teamSize: number,
  environmentCount: number,
  useWorkspaces: boolean,
  terraformCode: string
): "Low" | "Medium" | "High" {
  let score = 0;

  if (backend === "local" || backend === "unknown") {
    score += 3;
  }

  if (teamSize >= 8) {
    score += 1;
  }

  if (environmentCount >= 4) {
    score += 1;
  }

  if (environmentCount >= 4 && !useWorkspaces) {
    score += 1;
  }

  if (/backend\s+"s3"/i.test(terraformCode) && !/dynamodb_table\s*=|use_lockfile\s*=/i.test(terraformCode)) {
    score += 2;
  }

  if (/backend\s+"s3"/i.test(terraformCode) && !/encrypt\s*=\s*true/i.test(terraformCode)) {
    score += 1;
  }

  if (score >= 5) {
    return "High";
  }

  if (score >= 3) {
    return "Medium";
  }

  return "Low";
}

function getBackendSpecificGuidance(backend: Backend, code: string): string[] {
  switch (backend) {
    case "s3": {
      const guidance: string[] = [];
      if (!/dynamodb_table\s*=|use_lockfile\s*=/i.test(code)) {
        guidance.push("Enable state locking for S3 backend using DynamoDB or lockfile support.");
      }
      if (!/encrypt\s*=\s*true/i.test(code)) {
        guidance.push("Enable S3 backend encryption and enforce bucket-level encryption defaults.");
      }
      guidance.push("Limit state bucket access with least-privilege IAM and dedicated roles.");
      return guidance;
    }
    case "azurerm":
      return [
        "Use dedicated storage accounts/containers per environment or critical stack boundary.",
        "Restrict state access with RBAC and private network access where feasible.",
        "Enable storage account diagnostics and retention for auditability."
      ];
    case "gcs":
      return [
        "Enable object versioning and retention policies for state recovery.",
        "Use least-privilege IAM roles for state read/write operations.",
        "Segment state by environment and service ownership boundaries."
      ];
    case "remote":
      return [
        "Enforce run tasks/policy checks in remote execution workflows.",
        "Use workspace naming conventions tied to environment and stack names.",
        "Apply role-based permissions for plan/apply separation."
      ];
    case "local":
      return [
        "Migrate from local backend to remote state to prevent drift and lost state.",
        "Avoid shared local state files for team-based workflows.",
        "Use state migration planning before introducing remote backend in production."
      ];
    default:
      return [
        "Declare an explicit remote backend for collaboration, locking, and auditability.",
        "Keep backend configuration consistent across root modules."
      ];
  }
}

export const analyzeStateManagementTool: ToolDefinition<AnalyzeStateManagementInput> = {
  name: "analyze_state_management",
  description: "Assess Terraform backend/state strategy and recommend safer state management patterns.",
  inputSchema: analyzeStateManagementInputSchema,
  inputSchemaJson: analyzeStateManagementInputJsonSchema,
  run: async (input) => {
    const backend: Backend = input.currentBackend === "auto"
      ? inferBackend(input.terraformCode)
      : input.currentBackend;

    const riskLevel = getRiskLevel(
      backend,
      input.teamSize,
      input.environmentCount,
      input.useWorkspaces,
      input.terraformCode
    );

    const lines: string[] = [
      "# Terraform State Management Analysis",
      "",
      `Backend: ${backend}`,
      `Team size: ${input.teamSize}`,
      `Environment count: ${input.environmentCount}`,
      `Using workspaces: ${input.useWorkspaces ? "yes" : "no"}`,
      "",
      "## Risk Level",
      "",
      `**${riskLevel}**`,
      "",
      "## Recommendations",
      ""
    ];

    for (const item of getBackendSpecificGuidance(backend, input.terraformCode)) {
      lines.push(`- ${item}`);
    }

    if (input.environmentCount >= 4) {
      lines.push("- Keep state boundaries aligned to environment and service ownership.");
    }

    if (input.teamSize >= 10) {
      lines.push("- Require reviewed plans and controlled apply permissions to reduce accidental drift.");
    }

    lines.push(
      "",
      "## Operational Checks",
      "",
      "- Run periodic drift detection and investigate unmanaged changes.",
      "- Back up state snapshots and validate restore procedures quarterly.",
      "- Track backend configuration changes through pull requests and change approvals."
    );

    return lines.join("\n");
  }
};
