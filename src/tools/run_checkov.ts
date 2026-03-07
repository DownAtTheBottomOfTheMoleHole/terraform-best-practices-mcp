import { CommandNotFoundError, runCommand } from "../lib/exec.js";
import {
  commandToolInputJsonSchema,
  commandToolInputSchema,
  formatCommandExecution,
  missingCliMessage
} from "./common.js";
import type { CommandToolInput } from "./common.js";
import type { ToolDefinition } from "./types.js";

export const runCheckovInputSchema = commandToolInputSchema;
export type RunCheckovInput = CommandToolInput;

export const runCheckovTool: ToolDefinition<RunCheckovInput> = {
  name: "run_checkov",
  description: "Run checkov over a Terraform directory.",
  inputSchema: runCheckovInputSchema,
  inputSchemaJson: commandToolInputJsonSchema,
  run: async (input) => {
    try {
      const result = await runCommand("checkov", ["-d", input.path, ...input.extraArgs], {
        timeoutMs: input.timeoutMs
      });
      return formatCommandExecution(result);
    } catch (error) {
      if (error instanceof CommandNotFoundError) {
        return missingCliMessage("checkov");
      }
      throw error;
    }
  }
};
