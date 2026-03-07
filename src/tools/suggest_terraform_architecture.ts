import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const suggestTerraformArchitectureInputSchema = z.object({
  workloadType: z
    .enum(["web-api", "data-platform", "event-driven", "platform-foundation", "general"])
    .default("general"),
  environments: z
    .array(z.enum(["dev", "test", "stage", "prod", "sandbox", "dr"]))
    .min(1)
    .max(6)
    .default(["dev", "prod"]),
  multiRegion: z.boolean().default(false),
  complianceProfile: z.enum(["none", "cis", "pci-dss", "hipaa", "sox"]).default("none"),
  teamSize: z.number().int().min(1).max(500).default(6),
  currentPainPoints: z.string().max(6_000).optional(),
  includeReferenceLayout: z.boolean().default(true)
});

export type SuggestTerraformArchitectureInput = z.infer<
  typeof suggestTerraformArchitectureInputSchema
>;

export const suggestTerraformArchitectureInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    workloadType: {
      type: "string",
      enum: ["web-api", "data-platform", "event-driven", "platform-foundation", "general"],
      default: "general",
      description: "Primary workload profile for architecture recommendations."
    },
    environments: {
      type: "array",
      items: {
        type: "string",
        enum: ["dev", "test", "stage", "prod", "sandbox", "dr"]
      },
      minItems: 1,
      maxItems: 6,
      default: ["dev", "prod"],
      description: "Target environments to support in the architecture."
    },
    multiRegion: {
      type: "boolean",
      default: false,
      description: "Whether workloads run across multiple regions."
    },
    complianceProfile: {
      type: "string",
      enum: ["none", "cis", "pci-dss", "hipaa", "sox"],
      default: "none",
      description: "Compliance profile used to tune governance recommendations."
    },
    teamSize: {
      type: "integer",
      minimum: 1,
      maximum: 500,
      default: 6,
      description: "Number of engineers operating Terraform code."
    },
    currentPainPoints: {
      type: "string",
      description: "Optional pain points or constraints in the current architecture."
    },
    includeReferenceLayout: {
      type: "boolean",
      default: true,
      description: "Include a suggested repository and folder layout."
    }
  },
  additionalProperties: false
};

function getTopologyRecommendation(input: SuggestTerraformArchitectureInput): string {
  const envCount = input.environments.length;

  if (input.teamSize >= 12 || envCount >= 4) {
    return "Use a layered monorepo with strict directory boundaries and independent pipelines per stack.";
  }

  if (input.teamSize >= 6) {
    return "Use a monorepo with a platform layer and workload layers, and isolate state per environment.";
  }

  return "Use a compact monorepo with reusable modules and environment-specific root stacks.";
}

function getWorkloadGuidance(workloadType: SuggestTerraformArchitectureInput["workloadType"]): string[] {
  switch (workloadType) {
    case "web-api":
      return [
        "Split networking, security, and compute into separate root stacks.",
        "Promote immutable deployment artifacts across environments.",
        "Use shared service modules for load balancers, DNS, and observability."
      ];
    case "data-platform":
      return [
        "Separate data plane resources from control plane and IAM configuration.",
        "Require encryption, backup, and retention settings as module inputs.",
        "Define data access boundaries with explicit roles and network policies."
      ];
    case "event-driven":
      return [
        "Create dedicated modules for messaging primitives and event routing.",
        "Standardize retry, dead-letter, and alerting patterns in shared modules.",
        "Model event producers and consumers in separate stacks to reduce blast radius."
      ];
    case "platform-foundation":
      return [
        "Prioritize identity, policy, networking, and logging foundations first.",
        "Design tenant or account subscriptions as repeatable landing zone modules.",
        "Use a versioned platform API through module interfaces and release notes."
      ];
    default:
      return [
        "Group resources by lifecycle and ownership rather than provider service categories.",
        "Keep root stacks small and delegate complexity to reusable modules.",
        "Enforce deterministic naming, tagging, and policy baselines from shared locals."
      ];
  }
}

function getComplianceGuidance(profile: SuggestTerraformArchitectureInput["complianceProfile"]): string[] {
  switch (profile) {
    case "cis":
      return [
        "Add mandatory baseline policy checks to every pull request.",
        "Require logging and hardened defaults in all shared modules."
      ];
    case "pci-dss":
      return [
        "Isolate cardholder data zones with separate accounts/subscriptions and states.",
        "Require encryption and key rotation controls in module contracts."
      ];
    case "hipaa":
      return [
        "Define PHI handling boundaries in module inputs and naming conventions.",
        "Enforce immutable audit logging and least-privilege access patterns."
      ];
    case "sox":
      return [
        "Require approvals and change tickets for production stack applies.",
        "Keep clear separation between authors and approvers for critical stacks."
      ];
    default:
      return ["Use policy-as-code checks and environment protection rules before apply operations."];
  }
}

function buildReferenceLayout(environments: string[]): string {
  const envPaths = environments.map((env) => `infra/live/${env}/<stack>`).join("\n");

  return [
    "infra/",
    "  modules/",
    "    networking/",
    "    security/",
    "    compute/",
    "  live/",
    "    <environment>/",
    "      <stack>/",
    "  policies/",
    "  tests/",
    "",
    "Environment paths:",
    envPaths
  ].join("\n");
}

export const suggestTerraformArchitectureTool: ToolDefinition<SuggestTerraformArchitectureInput> = {
  name: "suggest_terraform_architecture",
  description: "Suggest Terraform architecture and repository patterns for multi-environment infrastructure.",
  inputSchema: suggestTerraformArchitectureInputSchema,
  inputSchemaJson: suggestTerraformArchitectureInputJsonSchema,
  run: async (input) => {
    const lines: string[] = [
      "# Terraform Architecture Guidance",
      "",
      `Workload: ${input.workloadType}`,
      `Environments: ${input.environments.join(", ")}`,
      `Multi-region: ${input.multiRegion ? "yes" : "no"}`,
      `Compliance profile: ${input.complianceProfile}`,
      `Team size: ${input.teamSize}`,
      ""
    ];

    lines.push("## Topology Recommendation", "");
    lines.push(getTopologyRecommendation(input));
    lines.push("");

    lines.push("## Workload-Specific Guidance", "");
    for (const guidance of getWorkloadGuidance(input.workloadType)) {
      lines.push(`- ${guidance}`);
    }

    if (input.multiRegion) {
      lines.push(
        "",
        "## Multi-Region Pattern",
        "",
        "- Keep global/shared services in dedicated stacks and region resources in per-region stacks.",
        "- Use provider aliases and explicit region maps to avoid accidental cross-region drift.",
        "- Gate region rollout with canary promotions before full deployment."
      );
    }

    lines.push("", "## Governance and Compliance", "");
    for (const guidance of getComplianceGuidance(input.complianceProfile)) {
      lines.push(`- ${guidance}`);
    }

    if (input.currentPainPoints?.trim()) {
      lines.push(
        "",
        "## Pain Point Mitigation",
        "",
        `- Current pain points: ${input.currentPainPoints.trim()}`,
        "- Prioritize one architecture guardrail per sprint to reduce operational risk incrementally."
      );
    }

    if (input.includeReferenceLayout) {
      lines.push("", "## Reference Layout", "", "```text", buildReferenceLayout(input.environments), "```");
    }

    return lines.join("\n");
  }
};
