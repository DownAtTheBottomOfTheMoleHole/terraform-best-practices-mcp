import { CommandNotFoundError, runCommand } from "../lib/exec.js";
import {
  commandToolInputJsonSchema,
  commandToolInputSchema,
  formatCommandExecution,
  missingCliMessage
} from "./common.js";
import type { CommandToolInput } from "./common.js";
import type { ToolDefinition } from "./types.js";

export const runKicsInputSchema = commandToolInputSchema;
export type RunKicsInput = CommandToolInput;

export const runKicsTool: ToolDefinition<RunKicsInput> = {
  name: "run_kics",
  description: "Run kics IaC scanning against Terraform code.",
  inputSchema: runKicsInputSchema,
  inputSchemaJson: commandToolInputJsonSchema,
  run: async (input) => {
    try {
      const result = await runCommand("kics", ["scan", "-p", input.path, ...input.extraArgs], {
        timeoutMs: input.timeoutMs
      });
      return formatCommandExecution(result);
    } catch (error) {
      if (error instanceof CommandNotFoundError) {
        return missingCliMessage("kics");
      }
      throw error;
    }
  }
};
