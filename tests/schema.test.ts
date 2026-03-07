import { describe, expect, it } from "vitest";
import { commandToolInputSchema } from "../src/tools/common.js";
import { fetchProviderBestPracticesInputSchema } from "../src/tools/fetch_provider_best_practices.js";
import { fetchTerraformRegistryGuidanceInputSchema } from "../src/tools/fetch_terraform_registry_guidance.js";

describe("tool schemas", () => {
  it("applies defaults for command tools", () => {
    const parsed = commandToolInputSchema.parse({});

    expect(parsed.path).toBe(".");
    expect(parsed.extraArgs).toEqual([]);
    expect(parsed.timeoutMs).toBeUndefined();
  });

  it("accepts only azure/aws/gcp for provider guidance", () => {
    expect(fetchProviderBestPracticesInputSchema.safeParse({ provider: "aws" }).success).toBe(true);
    expect(fetchProviderBestPracticesInputSchema.safeParse({ provider: "oracle" }).success).toBe(
      false
    );
  });

  it("supports optional Terraform Registry targeting fields", () => {
    const parsed = fetchTerraformRegistryGuidanceInputSchema.parse({
      provider: "aws",
      resource: "s3_bucket"
    });

    expect(parsed.provider).toBe("aws");
    expect(parsed.resource).toBe("s3_bucket");
    expect(parsed.liveFetch).toBe(true);
  });
});
