import { z } from "zod";
import { fetchText } from "../lib/http.js";
import { keywordSnippet, toPlainText } from "../lib/text.js";
import type { ToolDefinition } from "./types.js";

const providerSources = {
  azure: {
    url: "https://learn.microsoft.com/azure/developer/terraform/overview",
    practices: [
      "Use managed identity or workload identity instead of static credentials.",
      "Keep state in Azure Storage with blob versioning and lease locking.",
      "Model least-privilege RBAC for service principals and managed identities.",
      "Prefer provider aliases for multi-subscription or multi-tenant deployments.",
      "Use consistent resource tags for ownership, environment, and cost center.",
      "Use Azure Verified Modules where possible for baseline guardrails."
    ]
  },
  aws: {
    url: "https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/introduction.html",
    practices: [
      "Use dedicated IAM roles for Terraform runs and avoid long-lived keys.",
      "Separate state by account/environment with DynamoDB locking for S3 state.",
      "Pin provider and module versions for reproducible plans.",
      "Adopt tagging standards for cost allocation and inventory automation.",
      "Use data sources carefully and avoid hidden cross-account dependencies.",
      "Enforce security controls through policy and static analysis in CI."
    ]
  },
  gcp: {
    url: "https://cloud.google.com/docs/terraform/best-practices",
    practices: [
      "Use dedicated service accounts with least privilege and short-lived auth.",
      "Store state in versioned GCS buckets with access controls.",
      "Organize modules around folders/projects to match GCP hierarchy.",
      "Use explicit dependency modeling for APIs and IAM propagation-sensitive resources.",
      "Standardize labels for environment, ownership, and compliance.",
      "Run policy checks and drift detection as part of CI/CD workflows."
    ]
  }
} as const;

export const fetchProviderBestPracticesInputSchema = z.object({
  provider: z.enum(["azure", "aws", "gcp"]),
  topic: z.string().min(2).max(120).optional(),
  liveFetch: z.boolean().default(true)
});

export type FetchProviderBestPracticesInput = z.infer<
  typeof fetchProviderBestPracticesInputSchema
>;

export const fetchProviderBestPracticesInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    provider: {
      type: "string",
      enum: ["azure", "aws", "gcp"],
      description: "Cloud provider to retrieve Terraform best practices for."
    },
    topic: {
      type: "string",
      description: "Optional focus area, for example state, IAM, modules, networking, or cost."
    },
    liveFetch: {
      type: "boolean",
      description: "When true, attempts to fetch and summarize the linked provider guidance page.",
      default: true
    }
  },
  required: ["provider"],
  additionalProperties: false
};

function filteredPractices(practices: readonly string[], topic?: string): readonly string[] {
  if (!topic) {
    return practices;
  }

  const lowered = topic.toLowerCase();
  const filtered = practices.filter((practice) => practice.toLowerCase().includes(lowered));
  return filtered.length > 0 ? filtered : practices;
}

export const fetchProviderBestPracticesTool: ToolDefinition<FetchProviderBestPracticesInput> = {
  name: "fetch_provider_best_practices",
  description:
    "Fetch Terraform best-practice guidance for Azure, AWS, or GCP from curated checks and optional live provider docs summaries.",
  inputSchema: fetchProviderBestPracticesInputSchema,
  inputSchemaJson: fetchProviderBestPracticesInputJsonSchema,
  run: async (input) => {
    const source = providerSources[input.provider];
    const topic = input.topic?.trim();
    const practices = filteredPractices(source.practices, topic);

    const lines: string[] = [
      `Provider: ${input.provider}`,
      `Primary source: ${source.url}`,
      "Curated provider checklist:",
      ...practices.map((practice, index) => `${index + 1}. ${practice}`)
    ];

    if (!input.liveFetch) {
      lines.push("", "Live fetch disabled. Returning curated guidance only.");
      return lines.join("\n");
    }

    try {
      const html = await fetchText(source.url);
      const snippet = keywordSnippet(
        toPlainText(html),
        topic ? [topic, input.provider] : [input.provider, "terraform", "state", "security", "module"],
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
