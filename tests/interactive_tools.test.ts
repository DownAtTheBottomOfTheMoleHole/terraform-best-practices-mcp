import { describe, expect, it } from "vitest";
import { analyzeStateManagementTool } from "../src/tools/analyze_state_management.js";
import { analyzeTerraformPerformanceTool } from "../src/tools/analyze_terraform_performance.js";
import { generateTerraformModuleDocsTool } from "../src/tools/generate_terraform_module_docs.js";
import { recommendTerraformModulesTool } from "../src/tools/recommend_terraform_modules.js";
import { suggestTerraformArchitectureTool } from "../src/tools/suggest_terraform_architecture.js";
import { suggestTerraformTestingStrategyTool } from "../src/tools/suggest_terraform_testing_strategy.js";

const sampleTerraformCode = `
terraform {
  required_version = ">= 1.7.0"

  backend "s3" {
    bucket = "terraform-state-prod"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "app" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

output "vpc_id" {
  description = "VPC identifier"
  value       = aws_vpc.main.id
}
`;

describe("interactive tools", () => {
  it("recommends Terraform modules from code signals", async () => {
    const output = await recommendTerraformModulesTool.run({
      terraformCode: sampleTerraformCode,
      provider: "aws",
      deploymentIntent: "networking",
      maxRecommendations: 3
    });

    expect(output).toContain("# Terraform Module Recommendations");
    expect(output).toContain("## Suggested Modules");
  });

  it("suggests architecture guidance", async () => {
    const output = await suggestTerraformArchitectureTool.run({
      workloadType: "web-api",
      environments: ["dev", "stage", "prod"],
      multiRegion: true,
      complianceProfile: "cis",
      teamSize: 12,
      includeReferenceLayout: true
    });

    expect(output).toContain("# Terraform Architecture Guidance");
    expect(output).toContain("## Topology Recommendation");
    expect(output).toContain("## Reference Layout");
  });

  it("suggests testing strategy with pipeline stages", async () => {
    const output = await suggestTerraformTestingStrategyTool.run({
      terraformCode: sampleTerraformCode,
      deploymentCriticality: "high",
      changeFrequency: "high",
      ciSystem: "github-actions",
      includeExamplePipeline: true
    });

    expect(output).toContain("# Terraform Testing Strategy");
    expect(output).toContain("terraform fmt -check");
  });

  it("analyzes Terraform performance characteristics", async () => {
    const output = await analyzeTerraformPerformanceTool.run({
      terraformCode: sampleTerraformCode,
      stateSizeMb: 45,
      workspaceCount: 8,
      providerRateLimitSensitive: true
    });

    expect(output).toContain("# Terraform Performance Analysis");
    expect(output).toContain("## Performance Health Score");
  });

  it("assesses state management risk", async () => {
    const output = await analyzeStateManagementTool.run({
      terraformCode: sampleTerraformCode,
      teamSize: 10,
      environmentCount: 5,
      currentBackend: "auto",
      useWorkspaces: false
    });

    expect(output).toContain("# Terraform State Management Analysis");
    expect(output).toContain("## Risk Level");
  });

  it("generates terraform module docs markdown", async () => {
    const output = await generateTerraformModuleDocsTool.run({
      terraformCode: sampleTerraformCode,
      moduleName: "networking-module",
      includeUsageExample: true,
      includeInputsOutputsTables: true
    });

    expect(output).toContain("# networking-module");
    expect(output).toContain("## Inputs");
    expect(output).toContain("## Outputs");
    expect(output).toContain("## Usage Example");
  });
});
