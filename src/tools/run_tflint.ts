import { CommandNotFoundError, runCommand } from "../lib/exec.js";
import {
  commandToolInputJsonSchema,
  commandToolInputSchema,
  formatCommandExecution,
  missingCliMessage
} from "./common.js";
import type { CommandToolInput } from "./common.js";
import type { ToolDefinition } from "./types.js";

export const runTflintInputSchema = commandToolInputSchema;
export type RunTflintInput = CommandToolInput;

export const runTflintTool: ToolDefinition<RunTflintInput> = {
  name: "run_tflint",
  description: "Run tflint against a Terraform project directory.",
  inputSchema: runTflintInputSchema,
  inputSchemaJson: commandToolInputJsonSchema,
  run: async (input) => {
    try {
      const result = await runCommand("tflint", [...input.extraArgs], {
        cwd: input.path,
        timeoutMs: input.timeoutMs
      });
      return formatCommandExecution(result);
    } catch (error) {
      if (error instanceof CommandNotFoundError) {
        return missingCliMessage("tflint");
      }
      throw error;
    }
  }
};
