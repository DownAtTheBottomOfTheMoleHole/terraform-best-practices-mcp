import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const recommendTerraformModulesInputSchema = z.object({
  terraformCode: z.string().min(20).max(120_000),
  provider: z.enum(["aws", "azure", "gcp", "any"]).default("any"),
  deploymentIntent: z
    .enum([
      "networking",
      "kubernetes",
      "serverless",
      "storage",
      "database",
      "observability",
      "security",
      "general"
    ])
    .default("general"),
  maxRecommendations: z.number().int().min(1).max(10).default(5)
});

export type RecommendTerraformModulesInput = z.infer<typeof recommendTerraformModulesInputSchema>;

export const recommendTerraformModulesInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    terraformCode: {
      type: "string",
      description: "Terraform code used to infer likely module recommendations."
    },
    provider: {
      type: "string",
      enum: ["aws", "azure", "gcp", "any"],
      description: "Preferred cloud provider.",
      default: "any"
    },
    deploymentIntent: {
      type: "string",
      enum: [
        "networking",
        "kubernetes",
        "serverless",
        "storage",
        "database",
        "observability",
        "security",
        "general"
      ],
      description: "Primary deployment goal used to prioritize recommendations.",
      default: "general"
    },
    maxRecommendations: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      default: 5,
      description: "Maximum number of recommendations to return."
    }
  },
  required: ["terraformCode"],
  additionalProperties: false
};

interface ModuleCandidate {
  source: string;
  provider: "aws" | "azure" | "gcp";
  tags: string[];
  summary: string;
}

const moduleCatalog: ModuleCandidate[] = [
  {
    source: "terraform-aws-modules/vpc/aws",
    provider: "aws",
    tags: ["networking", "vpc", "subnet", "route", "nat"],
    summary: "Opinionated VPC baseline with subnet, route table, and NAT support."
  },
  {
    source: "terraform-aws-modules/eks/aws",
    provider: "aws",
    tags: ["kubernetes", "eks", "cluster", "node"],
    summary: "Managed EKS cluster composition with node groups and add-on support."
  },
  {
    source: "terraform-aws-modules/rds/aws",
    provider: "aws",
    tags: ["database", "rds", "postgres", "mysql"],
    summary: "Reusable RDS provisioning with networking and parameter group integration."
  },
  {
    source: "terraform-aws-modules/lambda/aws",
    provider: "aws",
    tags: ["serverless", "lambda"],
    summary: "Structured Lambda packaging and deployment inputs for repeatable serverless stacks."
  },
  {
    source: "terraform-google-modules/network/google",
    provider: "gcp",
    tags: ["networking", "vpc", "subnet", "firewall"],
    summary: "Composable GCP network module for shared VPC and subnet design."
  },
  {
    source: "terraform-google-modules/kubernetes-engine/google",
    provider: "gcp",
    tags: ["kubernetes", "gke", "cluster"],
    summary: "Production-oriented GKE module with standard cluster guardrails."
  },
  {
    source: "terraform-google-modules/sql-db/google",
    provider: "gcp",
    tags: ["database", "sql", "mysql", "postgres"],
    summary: "Cloud SQL module for consistent DB provisioning patterns."
  },
  {
    source: "Azure/avm-res-network-virtualnetwork/azurerm",
    provider: "azure",
    tags: ["networking", "vnet", "subnet", "nsg"],
    summary: "Azure Verified Module for virtual network baseline and subnet policy alignment."
  },
  {
    source: "Azure/avm-res-compute-virtualmachine/azurerm",
    provider: "azure",
    tags: ["compute", "vm", "general"],
    summary: "Azure Verified VM module for repeatable compute deployment standards."
  },
  {
    source: "Azure/avm-res-storage-storageaccount/azurerm",
    provider: "azure",
    tags: ["storage", "blob", "queue", "file"],
    summary: "Azure Verified storage module with secure-by-default options."
  },
  {
    source: "Azure/avm-res-sql-server/azurerm",
    provider: "azure",
    tags: ["database", "sql", "mssql"],
    summary: "Azure SQL server module for repeatable data platform setups."
  }
];

function detectTokens(terraformCode: string): Set<string> {
  const tokens = new Set<string>();
  const lowered = terraformCode.toLowerCase();

  const resourceMatches = terraformCode.matchAll(/resource\s+"([a-z0-9_]+)"\s+"([a-z0-9_-]+)"/gi);
  for (const match of resourceMatches) {
    tokens.add(match[1].toLowerCase());
    tokens.add(match[2].toLowerCase());
  }

  if (/vpc|virtual_network|subnet|route|firewall|network_security_group/i.test(lowered)) {
    tokens.add("networking");
  }
  if (/eks|aks|gke|kubernetes|kubernetes_cluster/i.test(lowered)) {
    tokens.add("kubernetes");
  }
  if (/lambda|function_app|cloud_function/i.test(lowered)) {
    tokens.add("serverless");
  }
  if (/storage|s3|blob|bucket/i.test(lowered)) {
    tokens.add("storage");
  }
  if (/rds|sql|database|postgres|mysql|mssql|spanner/i.test(lowered)) {
    tokens.add("database");
  }
  if (/cloudwatch|monitor|log_analytics|alert|metric/i.test(lowered)) {
    tokens.add("observability");
  }
  if (/iam|key_vault|kms|secret|identity/i.test(lowered)) {
    tokens.add("security");
  }

  return tokens;
}

function detectAlreadyUsedModules(terraformCode: string): Set<string> {
  const found = new Set<string>();
  const sourceMatches = terraformCode.matchAll(/source\s*=\s*"([^"]+)"/gi);

  for (const match of sourceMatches) {
    found.add(match[1].toLowerCase());
  }

  return found;
}

function detectProvider(terraformCode: string): "aws" | "azure" | "gcp" | "any" {
  const lowered = terraformCode.toLowerCase();

  if (/(provider\s+"azurerm")|(azurerm_)/i.test(lowered)) {
    return "azure";
  }
  if (/(provider\s+"aws")|(aws_)/i.test(lowered)) {
    return "aws";
  }
  if (/(provider\s+"google")|(google_)/i.test(lowered)) {
    return "gcp";
  }

  return "any";
}

interface ScoredModule {
  candidate: ModuleCandidate;
  score: number;
  matchedTags: string[];
}

function scoreModules(
  candidates: ModuleCandidate[],
  tokens: Set<string>,
  requestedProvider: "aws" | "azure" | "gcp" | "any",
  deploymentIntent: string,
  alreadyUsedModules: Set<string>
): ScoredModule[] {
  const scored: ScoredModule[] = [];

  for (const candidate of candidates) {
    if (requestedProvider !== "any" && candidate.provider !== requestedProvider) {
      continue;
    }

    const normalizedSource = candidate.source.toLowerCase();
    const alreadyUsed = [...alreadyUsedModules].some((used) => used.includes(normalizedSource));
    if (alreadyUsed) {
      continue;
    }

    const matchedTags = candidate.tags.filter((tag) => tokens.has(tag));
    let score = matchedTags.length * 2;

    if (candidate.tags.includes(deploymentIntent)) {
      score += 3;
    }

    if (deploymentIntent === "general") {
      score += 1;
    }

    if (score > 0) {
      scored.push({ candidate, score, matchedTags });
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}

export const recommendTerraformModulesTool: ToolDefinition<RecommendTerraformModulesInput> = {
  name: "recommend_terraform_modules",
  description: "Recommend Terraform Registry modules based on code patterns and deployment intent.",
  inputSchema: recommendTerraformModulesInputSchema,
  inputSchemaJson: recommendTerraformModulesInputJsonSchema,
  run: async (input) => {
    const detectedProvider = detectProvider(input.terraformCode);
    const provider = input.provider === "any" ? detectedProvider : input.provider;
    const tokens = detectTokens(input.terraformCode);
    const alreadyUsedModules = detectAlreadyUsedModules(input.terraformCode);

    const scored = scoreModules(
      moduleCatalog,
      tokens,
      provider,
      input.deploymentIntent,
      alreadyUsedModules
    ).slice(0, input.maxRecommendations);

    const lines: string[] = [
      "# Terraform Module Recommendations",
      "",
      `Detected provider: ${detectedProvider}`,
      `Selected provider: ${provider}`,
      `Deployment intent: ${input.deploymentIntent}`,
      ""
    ];

    if (scored.length === 0) {
      lines.push(
        "No strong module matches were found from current signals.",
        "Try using deploymentIntent=general or include more representative resource blocks."
      );
      return lines.join("\n");
    }

    lines.push("## Suggested Modules", "");
    for (const [index, recommendation] of scored.entries()) {
      const matched = recommendation.matchedTags.length > 0
        ? recommendation.matchedTags.join(", ")
        : "general fit";

      lines.push(`${index + 1}. ${recommendation.candidate.source}`);
      lines.push(`   - Why: ${recommendation.candidate.summary}`);
      lines.push(`   - Signal matches: ${matched}`);
    }

    lines.push(
      "",
      "## Adoption Tips",
      "",
      "- Pin module versions and review release notes before upgrades.",
      "- Start by wrapping recommended modules in your own composition layer.",
      "- Add policy checks and tests before introducing modules into production environments."
    );

    return lines.join("\n");
  }
};
