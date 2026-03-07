import { z } from "zod";
import { fetchText } from "../lib/http.js";
import { keywordSnippet, toPlainText } from "../lib/text.js";
import type { ToolDefinition } from "./types.js";

const sourceUrl = "https://www.terraform-best-practices.com/";

const curatedPractices = [
  "Pin Terraform and provider versions to avoid unexpected upgrades.",
  "Keep modules small and focused, with clear inputs and outputs.",
  "Use remote state with locking and encryption enabled.",
  "Adopt a consistent naming convention for resources, variables, and outputs.",
  "Prefer `for_each` over `count` for stable resource addressing.",
  "Use `validation` blocks for variables and preconditions on critical resources.",
  "Separate environments by state/workspace boundaries to reduce blast radius.",
  "Treat plans as review artifacts in CI before apply.",
  "Store secrets in dedicated secret managers instead of plaintext variables.",
  "Use policy-as-code and linting in CI (tflint/checkov/trivy/kics).",
  "Document each module with usage examples and constraints.",
  "Continuously track cost drift with tools such as infracost."
];

export const fetchTerraformBestPracticesInputSchema = z.object({
  topic: z.string().min(2).max(120).optional(),
  liveFetch: z.boolean().default(true)
});

export type FetchTerraformBestPracticesInput = z.infer<
  typeof fetchTerraformBestPracticesInputSchema
>;

export const fetchTerraformBestPracticesInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    topic: {
      type: "string",
      description: "Optional topic filter such as state, modules, security, or naming."
    },
    liveFetch: {
      type: "boolean",
      description: "When true, attempts to fetch and summarize live content from terraform-best-practices.com.",
      default: true
    }
  },
  additionalProperties: false
};

function filterPractices(topic?: string): string[] {
  if (!topic) {
    return curatedPractices;
  }

  const loweredTopic = topic.toLowerCase();
  const filtered = curatedPractices.filter((practice) =>
    practice.toLowerCase().includes(loweredTopic)
  );

  return filtered.length > 0 ? filtered : curatedPractices;
}

export const fetchTerraformBestPracticesTool: ToolDefinition<FetchTerraformBestPracticesInput> = {
  name: "fetch_terraform_best_practices",
  description:
    "Fetch Terraform best-practice guidance from curated checks and optional live summaries from terraform-best-practices.com.",
  inputSchema: fetchTerraformBestPracticesInputSchema,
  inputSchemaJson: fetchTerraformBestPracticesInputJsonSchema,
  run: async (input) => {
    const topic = input.topic?.trim();
    const practices = filterPractices(topic);

    const lines: string[] = [
      `Source: ${sourceUrl}`,
      "Curated Terraform best-practice checklist:",
      ...practices.map((practice, index) => `${index + 1}. ${practice}`)
    ];

    if (!input.liveFetch) {
      lines.push("", "Live fetch disabled. Returning curated guidance only.");
      return lines.join("\n");
    }

    try {
      const html = await fetchText(sourceUrl);
      const text = toPlainText(html);
      const snippet = keywordSnippet(
        text,
        topic
          ? [topic]
          : ["state", "module", "provider", "security", "variable", "output", "version"],
        1800
      );

      lines.push("", "Live excerpt:", snippet || "No matching live excerpt found.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      lines.push("", `Live fetch unavailable: ${reason}`);
    }

    return lines.join("\n");
  }
};
