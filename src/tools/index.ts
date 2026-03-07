import { fetchProviderBestPracticesTool } from "./fetch_provider_best_practices.js";
import { fetchTerraformBestPracticesTool } from "./fetch_terraform_best_practices.js";
import { fetchTerraformRegistryGuidanceTool } from "./fetch_terraform_registry_guidance.js";
import { runCheckovTool } from "./run_checkov.js";
import { runInfracostTool } from "./run_infracost.js";
import { runKicsTool } from "./run_kics.js";
import { runTflintTool } from "./run_tflint.js";
import { runTrivyTool } from "./run_trivy.js";
import type { ToolDefinition } from "./types.js";

export const allTools: ToolDefinition<any>[] = [
  runTflintTool,
  runCheckovTool,
  runTrivyTool,
  runKicsTool,
  runInfracostTool,
  fetchTerraformBestPracticesTool,
  fetchProviderBestPracticesTool,
  fetchTerraformRegistryGuidanceTool
];
