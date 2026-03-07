import { CommandNotFoundError, runCommand } from "../lib/exec.js";
import {
  commandToolInputJsonSchema,
  commandToolInputSchema,
  formatCommandExecution,
  missingCliMessage
} from "./common.js";
import type { CommandToolInput } from "./common.js";
import type { ToolDefinition } from "./types.js";

export const runTrivyInputSchema = commandToolInputSchema;
export type RunTrivyInput = CommandToolInput;

export const runTrivyTool: ToolDefinition<RunTrivyInput> = {
  name: "run_trivy",
  description: "Run trivy config scanning against Terraform code.",
  inputSchema: runTrivyInputSchema,
  inputSchemaJson: commandToolInputJsonSchema,
  run: async (input) => {
    try {
      const result = await runCommand("trivy", ["config", input.path, ...input.extraArgs], {
        timeoutMs: input.timeoutMs
      });
      return formatCommandExecution(result);
    } catch (error) {
      if (error instanceof CommandNotFoundError) {
        return missingCliMessage("trivy");
      }
      throw error;
    }
  }
};
