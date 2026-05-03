import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const analyzeTerraformCodeInputSchema = z.object({
  code: z.string().min(10).max(50_000),
  focusArea: z.enum(["modularity", "variables", "outputs", "locals", "general"]).default("general")
});

export type AnalyzeTerraformCodeInput = z.infer<typeof analyzeTerraformCodeInputSchema>;

export const analyzeTerraformCodeInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: "Terraform code snippet to analyze (max 50,000 chars)."
    },
    focusArea: {
      type: "string",
      enum: ["modularity", "variables", "outputs", "locals", "general"],
      description: "Analysis focus area: modularity, variables, outputs, locals, or general.",
      default: "general"
    }
  },
  required: ["code"],
  additionalProperties: false
};

function analyzeModularity(code: string): string[] {
  const suggestions: string[] = [];

  if (code.length > 10_000) {
    suggestions.push("✓ Code size is large; consider breaking into smaller modules.");
  }

  const resourceCount = (code.match(/^resource\s+"/gm) || []).length;
  if (resourceCount > 10) {
    suggestions.push(`✓ Found ${resourceCount} resources; consider grouping logically into sub-modules.`);
  }

  if (!code.includes("variable")) {
    suggestions.push("⚠ No input variables found; consider parameterizing hardcoded values.");
  }

  if (!code.includes("output")) {
    suggestions.push("⚠ No outputs defined; consider exporting key resource attributes for reuse.");
  }

  if (!code.includes("locals")) {
    suggestions.push("◌ No local values found; consider using locals for computed or repeated values.");
  }

  return suggestions.length > 0
    ? suggestions
    : ["✓ Code structure looks organized and modular."];
}

function analyzeVariables(code: string): string[] {
  const suggestions: string[] = [];

  const variableBlocks = code.match(/variable\s+"([^"]+)"/g) || [];
  if (variableBlocks.length === 0) {
    return ["⚠ No variables defined; parameterize configuration for reuse."];
  }

  if (variableBlocks.length === 1) {
    suggestions.push(
      "◌ Only one variable found; consider adding more parameters for flexibility."
    );
  }

  if (!code.includes('default')) {
    suggestions.push("◌ Variables lack defaults; consider adding sensible defaults where appropriate.");
  }

  if (!code.includes('type')) {
    suggestions.push("⚠ Variables lack type constraints; add `type` to improve validation.");
  }

  if (!code.includes('validation')) {
    suggestions.push(
      "◌ Consider adding `validation` blocks to enforce business logic on variables."
    );
  }

  return suggestions.length > 0
    ? suggestions
    : ["✓ Variables are well-defined with types and validation."];
}

function analyzeGeneral(code: string): string[] {
  const suggestions: string[] = [];

  if (code.includes("provider") && !code.includes("terraform_version")) {
    suggestions.push("⚠ No Terraform version constraint found; add `required_version` for reproducibility.");
  }

  if (code.includes("data ") && !code.includes("depends_on")) {
    suggestions.push(
      "◌ Data sources detected; verify they have explicit or implicit dependencies documented."
    );
  }

  if (!code.includes("required_providers")) {
    suggestions.push("⚠ Missing `required_providers` block; pin provider versions for stability.");
  }

  if (code.includes("count") && code.includes("for_each")) {
    suggestions.push("⚠ Both `count` and `for_each` used; prefer `for_each` for stable resource addressing.");
  }

  if (!code.includes("#")) {
    suggestions.push("◌ No comments found; add comments to explain complex logic and intent.");
  }

  return suggestions.length > 0
    ? suggestions
    : ["✓ Code follows general Terraform best practices."];
}

export const analyzeTerraformCodeTool: ToolDefinition<AnalyzeTerraformCodeInput> = {
  name: "analyze_terraform_code",
  description: "Analyze Terraform code structure, modularity, variables, and best practices.",
  inputSchema: analyzeTerraformCodeInputSchema,
  inputSchemaJson: analyzeTerraformCodeInputJsonSchema,
  run: async (input) => {
    let suggestions: string[];

    switch (input.focusArea) {
      case "modularity":
        suggestions = analyzeModularity(input.code);
        break;
      case "variables":
        suggestions = analyzeVariables(input.code);
        break;
      default:
        suggestions = analyzeGeneral(input.code);
    }

    const lines = [
      `Analysis report for focus area: ${input.focusArea}`,
      "",
      ...suggestions
    ];

    return lines.join("\n");
  }
};
