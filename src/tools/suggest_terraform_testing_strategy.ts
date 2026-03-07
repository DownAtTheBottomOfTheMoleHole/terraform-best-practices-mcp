import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const suggestTerraformTestingStrategyInputSchema = z.object({
  terraformCode: z.string().max(120_000).optional(),
  deploymentCriticality: z.enum(["low", "medium", "high", "mission-critical"]).default("medium"),
  changeFrequency: z.enum(["low", "medium", "high"]).default("medium"),
  ciSystem: z
    .enum(["github-actions", "azure-devops", "gitlab", "circleci", "jenkins", "other"])
    .default("github-actions"),
  includeExamplePipeline: z.boolean().default(true)
});

export type SuggestTerraformTestingStrategyInput = z.infer<
  typeof suggestTerraformTestingStrategyInputSchema
>;

export const suggestTerraformTestingStrategyInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    terraformCode: {
      type: "string",
      description: "Optional Terraform code for complexity-aware recommendations."
    },
    deploymentCriticality: {
      type: "string",
      enum: ["low", "medium", "high", "mission-critical"],
      default: "medium",
      description: "Business impact level if infrastructure changes fail."
    },
    changeFrequency: {
      type: "string",
      enum: ["low", "medium", "high"],
      default: "medium",
      description: "How often infrastructure changes are introduced."
    },
    ciSystem: {
      type: "string",
      enum: ["github-actions", "azure-devops", "gitlab", "circleci", "jenkins", "other"],
      default: "github-actions",
      description: "Target CI system for pipeline guidance."
    },
    includeExamplePipeline: {
      type: "boolean",
      default: true,
      description: "Include an example pipeline sequence."
    }
  },
  additionalProperties: false
};

interface CodeSignals {
  resourceCount: number;
  moduleCount: number;
  hasDataSources: boolean;
}

function analyzeSignals(terraformCode?: string): CodeSignals {
  if (!terraformCode) {
    return {
      resourceCount: 0,
      moduleCount: 0,
      hasDataSources: false
    };
  }

  return {
    resourceCount: (terraformCode.match(/^\s*resource\s+"/gm) || []).length,
    moduleCount: (terraformCode.match(/^\s*module\s+"/gm) || []).length,
    hasDataSources: /^\s*data\s+"/gim.test(terraformCode)
  };
}

function getValidationDepth(criticality: SuggestTerraformTestingStrategyInput["deploymentCriticality"]): string[] {
  if (criticality === "mission-critical" || criticality === "high") {
    return [
      "Require `terraform fmt -check`, `terraform validate`, `tflint`, `checkov`, and `trivy` on every pull request.",
      "Block applies unless plan output has peer approval and policy checks pass.",
      "Run integration tests in ephemeral environments before production promotion."
    ];
  }

  if (criticality === "medium") {
    return [
      "Require lint and security checks on pull requests.",
      "Use plan-only checks for feature branches and gated applies for main branch.",
      "Run smoke integration tests for modules with stateful resources."
    ];
  }

  return [
    "Run fmt/validate/lint checks by default and keep apply permissions limited.",
    "Use periodic integration tests for key stacks."
  ];
}

function getChangeCadenceGuidance(frequency: SuggestTerraformTestingStrategyInput["changeFrequency"]): string[] {
  switch (frequency) {
    case "high":
      return [
        "Adopt short-lived feature branches and fast, deterministic test stages.",
        "Run drift detection daily and rotate ownership for failed checks.",
        "Use targeted test selection for unchanged modules to keep pipelines fast."
      ];
    case "low":
      return [
        "Run full validation suites even for small changes to catch stale assumptions.",
        "Schedule periodic pipeline dry runs to ensure toolchains stay current."
      ];
    default:
      return [
        "Keep a balanced test mix: quick PR checks plus regular deeper integration tests.",
        "Use release tags for infrastructure promotions across environments."
      ];
  }
}

function getPipelineTemplate(ciSystem: SuggestTerraformTestingStrategyInput["ciSystem"]): string[] {
  const ciLabel = ciSystem === "other" ? "your CI" : ciSystem;

  return [
    `Pipeline target: ${ciLabel}`,
    "1. format-and-validate: terraform fmt -check -recursive && terraform init -backend=false && terraform validate",
    "2. static-analysis: tflint --recursive && checkov -d . && trivy config .",
    "3. plan: terraform plan -out=tfplan",
    "4. integration-tests: go test ./test -v (or terraform test where applicable)",
    "5. gated-apply: terraform apply tfplan after approval"
  ];
}

export const suggestTerraformTestingStrategyTool: ToolDefinition<SuggestTerraformTestingStrategyInput> = {
  name: "suggest_terraform_testing_strategy",
  description: "Recommend Terraform testing strategy and CI stages based on risk and change cadence.",
  inputSchema: suggestTerraformTestingStrategyInputSchema,
  inputSchemaJson: suggestTerraformTestingStrategyInputJsonSchema,
  run: async (input) => {
    const signals = analyzeSignals(input.terraformCode);

    const lines: string[] = [
      "# Terraform Testing Strategy",
      "",
      `Deployment criticality: ${input.deploymentCriticality}`,
      `Change frequency: ${input.changeFrequency}`,
      `CI system: ${input.ciSystem}`,
      ""
    ];

    lines.push("## Risk-Based Strategy", "");
    for (const item of getValidationDepth(input.deploymentCriticality)) {
      lines.push(`- ${item}`);
    }

    lines.push("", "## Change Cadence Guidance", "");
    for (const item of getChangeCadenceGuidance(input.changeFrequency)) {
      lines.push(`- ${item}`);
    }

    lines.push("", "## Code Signal Summary", "");
    lines.push(`- Resources detected: ${signals.resourceCount}`);
    lines.push(`- Modules detected: ${signals.moduleCount}`);
    lines.push(`- Data sources present: ${signals.hasDataSources ? "yes" : "no"}`);

    if (signals.moduleCount >= 5 || signals.resourceCount >= 30) {
      lines.push(
        "- Recommendation: add module-level integration tests and parallelize test execution per stack."
      );
    }

    if (input.includeExamplePipeline) {
      lines.push("", "## Example Pipeline", "");
      for (const line of getPipelineTemplate(input.ciSystem)) {
        lines.push(line);
      }
    }

    return lines.join("\n");
  }
};
