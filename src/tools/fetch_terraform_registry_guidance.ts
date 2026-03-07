import { z } from "zod";
import { fetchText } from "../lib/http.js";
import { keywordSnippet, toPlainText } from "../lib/text.js";
import type { ToolDefinition } from "./types.js";

const defaultRegistryUrl = "https://registry.terraform.io/";

const registryPractices = [
  "Pin provider and module versions instead of using unbounded constraints.",
  "Prefer well-maintained modules with clear versioning and examples.",
  "Read provider resource docs for force-recreate fields and lifecycle behavior.",
  "Use module inputs/outputs intentionally and avoid overexposing internals.",
  "Validate required providers and Terraform versions in every module.",
  "Track breaking changes across provider major versions before upgrades."
];

export const fetchTerraformRegistryGuidanceInputSchema = z.object({
  provider: z.string().min(1).max(120).optional(),
  resource: z.string().min(1).max(120).optional(),
  module: z.string().min(1).max(240).optional(),
  topic: z.string().min(2).max(120).optional(),
  liveFetch: z.boolean().default(true)
});

export type FetchTerraformRegistryGuidanceInput = z.infer<
  typeof fetchTerraformRegistryGuidanceInputSchema
>;

export const fetchTerraformRegistryGuidanceInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    provider: {
      type: "string",
      description: "Optional provider name, for example aws, azurerm, or google."
    },
    resource: {
      type: "string",
      description: "Optional resource type used with provider, for example s3_bucket or resource_group."
    },
    module: {
      type: "string",
      description: "Optional module path in the form namespace/name/provider."
    },
    topic: {
      type: "string",
      description: "Optional topic filter for the summary output."
    },
    liveFetch: {
      type: "boolean",
      description: "When true, fetches and summarizes selected Terraform Registry pages.",
      default: true
    }
  },
  additionalProperties: false
};

function selectPractices(topic?: string): string[] {
  if (!topic) {
    return registryPractices;
  }

  const lowered = topic.toLowerCase();
  const filtered = registryPractices.filter((item) => item.toLowerCase().includes(lowered));
  return filtered.length > 0 ? filtered : registryPractices;
}

function buildRegistryUrls(input: FetchTerraformRegistryGuidanceInput): string[] {
  const urls: string[] = [];

  const modulePath = input.module?.trim();
  if (modulePath) {
    urls.push(`https://registry.terraform.io/modules/${encodeURI(modulePath)}`);
  }

  const provider = input.provider?.trim();
  const resource = input.resource?.trim();
  if (provider && resource) {
    urls.push(
      `https://registry.terraform.io/providers/hashicorp/${encodeURIComponent(
        provider
      )}/latest/docs/resources/${encodeURIComponent(resource)}`
    );
  }

  if (urls.length === 0) {
    urls.push(defaultRegistryUrl);
  }

  return urls;
}

export const fetchTerraformRegistryGuidanceTool: ToolDefinition<FetchTerraformRegistryGuidanceInput> = {
  name: "fetch_terraform_registry_guidance",
  description:
    "Fetch Terraform Registry best-practice guidance with optional provider/resource/module context.",
  inputSchema: fetchTerraformRegistryGuidanceInputSchema,
  inputSchemaJson: fetchTerraformRegistryGuidanceInputJsonSchema,
  run: async (input) => {
    const topic = input.topic?.trim();
    const practices = selectPractices(topic);
    const urls = buildRegistryUrls(input);

    const lines: string[] = [
      `Registry source: ${defaultRegistryUrl}`,
      "Curated Terraform Registry checklist:",
      ...practices.map((practice, index) => `${index + 1}. ${practice}`)
    ];

    if (!input.liveFetch) {
      lines.push("", "Live fetch disabled. Returning curated guidance only.");
      return lines.join("\n");
    }

    const keywords = [
      ...(topic ? [topic] : []),
      ...(input.provider ? [input.provider] : []),
      ...(input.resource ? [input.resource] : []),
      ...(input.module ? [input.module] : []),
      "terraform",
      "version",
      "provider",
      "module"
    ];

    for (const url of urls) {
      try {
        const html = await fetchText(url);
        const snippet = keywordSnippet(toPlainText(html), keywords, 1400);
        lines.push("", `Live excerpt (${url}):`, snippet || "No matching live excerpt found.");
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        lines.push("", `Live fetch unavailable for ${url}: ${reason}`);
      }
    }

    return lines.join("\n");
  }
};
