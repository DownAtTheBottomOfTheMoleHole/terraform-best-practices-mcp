import { analyzeTerraformCodeTool } from "./analyze_terraform_code.js";
import { analyzeTerraformPerformanceTool } from "./analyze_terraform_performance.js";
import { analyzeStateManagementTool } from "./analyze_state_management.js";
import { fetchProviderBestPracticesTool } from "./fetch_provider_best_practices.js";
import { fetchTerraformBestPracticesTool } from "./fetch_terraform_best_practices.js";
import { fetchTerraformRegistryGuidanceTool } from "./fetch_terraform_registry_guidance.js";
import { generateComplianceSummaryTool } from "./generate_compliance_summary.js";
import { generateCostReportTool } from "./generate_cost_report.js";
import { generateTerraformModuleDocsTool } from "./generate_terraform_module_docs.js";
import { recommendTerraformModulesTool } from "./recommend_terraform_modules.js";
import { runCheckovTool } from "./run_checkov.js";
import { runInfracostTool } from "./run_infracost.js";
import { runKicsTool } from "./run_kics.js";
import { suggestTerraformArchitectureTool } from "./suggest_terraform_architecture.js";
import { suggestTerraformTestingStrategyTool } from "./suggest_terraform_testing_strategy.js";
import { runTflintTool } from "./run_tflint.js";
import { runTrivyTool } from "./run_trivy.js";
import { suggestSecurityHardeningTool } from "./suggest_security_hardening.js";
import type { ToolDefinition } from "./types.js";

export const allTools: ToolDefinition<any>[] = [
  runTflintTool,
  runCheckovTool,
  runTrivyTool,
  runKicsTool,
  runInfracostTool,
  fetchTerraformBestPracticesTool,
  fetchProviderBestPracticesTool,
  fetchTerraformRegistryGuidanceTool,
  analyzeTerraformCodeTool,
  analyzeTerraformPerformanceTool,
  analyzeStateManagementTool,
  generateCostReportTool,
  generateTerraformModuleDocsTool,
  recommendTerraformModulesTool,
  suggestSecurityHardeningTool,
  suggestTerraformArchitectureTool,
  suggestTerraformTestingStrategyTool,
  generateComplianceSummaryTool
];
