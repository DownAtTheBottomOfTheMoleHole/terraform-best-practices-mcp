import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const generateTerraformModuleDocsInputSchema = z.object({
  terraformCode: z.string().min(20).max(200_000),
  moduleName: z.string().min(1).max(120).default("terraform-module"),
  includeUsageExample: z.boolean().default(true),
  includeInputsOutputsTables: z.boolean().default(true)
});

export type GenerateTerraformModuleDocsInput = z.infer<typeof generateTerraformModuleDocsInputSchema>;

export const generateTerraformModuleDocsInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    terraformCode: {
      type: "string",
      description: "Terraform module code to document."
    },
    moduleName: {
      type: "string",
      default: "terraform-module",
      description: "Friendly name used in generated markdown docs."
    },
    includeUsageExample: {
      type: "boolean",
      default: true,
      description: "Include a usage example section."
    },
    includeInputsOutputsTables: {
      type: "boolean",
      default: true,
      description: "Render inputs and outputs as markdown tables."
    }
  },
  required: ["terraformCode"],
  additionalProperties: false
};

interface NamedBlock {
  name: string;
  body: string;
}

interface VariableDoc {
  name: string;
  description: string;
  type: string;
  required: boolean;
  defaultValue: string;
}

interface OutputDoc {
  name: string;
  description: string;
  sensitive: boolean;
}

function extractNamedBlocks(code: string, blockType: string): NamedBlock[] {
  const lines = code.split(/\r?\n/);
  const result: NamedBlock[] = [];
  const startPattern = new RegExp(`^\\s*${blockType}\\s+"([^"]+)"\\s*\\{\\s*$`);

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(startPattern);

    if (!match) {
      index += 1;
      continue;
    }

    const blockName = match[1];
    const bodyLines: string[] = [];
    let depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    index += 1;

    while (index < lines.length && depth > 0) {
      const currentLine = lines[index];
      depth += (currentLine.match(/\{/g) || []).length;
      depth -= (currentLine.match(/\}/g) || []).length;

      if (depth > 0) {
        bodyLines.push(currentLine);
      }

      index += 1;
    }

    result.push({
      name: blockName,
      body: bodyLines.join("\n")
    });
  }

  return result;
}

function extractAttribute(body: string, key: string): string | undefined {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, "m");
  const match = body.match(pattern);
  if (!match) {
    return undefined;
  }

  return match[1].trim();
}

function normalizeQuoted(value?: string): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function collectVariables(code: string): VariableDoc[] {
  return extractNamedBlocks(code, "variable").map((block) => {
    const description = normalizeQuoted(extractAttribute(block.body, "description"));
    const type = extractAttribute(block.body, "type") ?? "any";
    const defaultValue = extractAttribute(block.body, "default") ?? "";

    return {
      name: block.name,
      description: description || "No description provided.",
      type,
      required: defaultValue === "",
      defaultValue: defaultValue === "" ? "n/a" : defaultValue
    };
  });
}

function collectOutputs(code: string): OutputDoc[] {
  return extractNamedBlocks(code, "output").map((block) => {
    const description = normalizeQuoted(extractAttribute(block.body, "description"));
    const sensitiveRaw = extractAttribute(block.body, "sensitive") ?? "false";

    return {
      name: block.name,
      description: description || "No description provided.",
      sensitive: /true/i.test(sensitiveRaw)
    };
  });
}

function collectResources(code: string): Array<{ type: string; name: string }> {
  const resources = code.matchAll(/resource\s+"([a-z0-9_]+)"\s+"([a-z0-9_-]+)"/gi);
  return [...resources].map((match) => ({
    type: match[1],
    name: match[2]
  }));
}

function collectProviders(code: string): string[] {
  const providers = code.matchAll(/provider\s+"([a-z0-9_-]+)"/gi);
  const unique = new Set<string>();
  for (const provider of providers) {
    unique.add(provider[1]);
  }

  return [...unique];
}

function renderInputsTable(items: VariableDoc[]): string[] {
  if (items.length === 0) {
    return ["No input variables found."];
  }

  const lines = [
    "| Name | Description | Type | Required | Default |",
    "| --- | --- | --- | --- | --- |"
  ];

  for (const item of items) {
    lines.push(
      `| ${item.name} | ${item.description} | \`${item.type}\` | ${item.required ? "yes" : "no"} | \`${item.defaultValue}\` |`
    );
  }

  return lines;
}

function renderOutputsTable(items: OutputDoc[]): string[] {
  if (items.length === 0) {
    return ["No outputs found."];
  }

  const lines = [
    "| Name | Description | Sensitive |",
    "| --- | --- | --- |"
  ];

  for (const item of items) {
    lines.push(`| ${item.name} | ${item.description} | ${item.sensitive ? "yes" : "no"} |`);
  }

  return lines;
}

function renderUsageExample(moduleName: string, variables: VariableDoc[]): string {
  const lines = [
    `module "${moduleName}" {`,
    "  source = \"./modules/<path>\""
  ];

  for (const variable of variables.slice(0, 6)) {
    lines.push(`  ${variable.name} = var.${variable.name}`);
  }

  lines.push("}");
  return lines.join("\n");
}

export const generateTerraformModuleDocsTool: ToolDefinition<GenerateTerraformModuleDocsInput> = {
  name: "generate_terraform_module_docs",
  description: "Generate markdown documentation for Terraform modules from source code.",
  inputSchema: generateTerraformModuleDocsInputSchema,
  inputSchemaJson: generateTerraformModuleDocsInputJsonSchema,
  run: async (input) => {
    const variables = collectVariables(input.terraformCode);
    const outputs = collectOutputs(input.terraformCode);
    const resources = collectResources(input.terraformCode);
    const providers = collectProviders(input.terraformCode);

    const lines: string[] = [
      `# ${input.moduleName}`,
      "",
      "## Overview",
      "",
      "Generated Terraform module documentation.",
      ""
    ];

    lines.push("## Providers", "");
    if (providers.length === 0) {
      lines.push("No provider blocks found.");
    } else {
      for (const provider of providers) {
        lines.push(`- ${provider}`);
      }
    }

    lines.push("", "## Resources", "");
    if (resources.length === 0) {
      lines.push("No resource blocks found.");
    } else {
      for (const resource of resources) {
        lines.push(`- ${resource.type}.${resource.name}`);
      }
    }

    lines.push("", "## Inputs", "");
    if (input.includeInputsOutputsTables) {
      lines.push(...renderInputsTable(variables));
    } else {
      for (const variable of variables) {
        lines.push(`- ${variable.name}: ${variable.description}`);
      }
    }

    lines.push("", "## Outputs", "");
    if (input.includeInputsOutputsTables) {
      lines.push(...renderOutputsTable(outputs));
    } else {
      for (const output of outputs) {
        lines.push(`- ${output.name}: ${output.description}`);
      }
    }

    if (input.includeUsageExample) {
      lines.push(
        "",
        "## Usage Example",
        "",
        "```hcl",
        renderUsageExample(input.moduleName, variables),
        "```"
      );
    }

    return lines.join("\n");
  }
};
