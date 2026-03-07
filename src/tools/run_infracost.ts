import { CommandNotFoundError, runCommand } from "../lib/exec.js";
import {
  commandToolInputJsonSchema,
  commandToolInputSchema,
  formatCommandExecution,
  missingCliMessage
} from "./common.js";
import type { CommandToolInput } from "./common.js";
import type { ToolDefinition } from "./types.js";

export const runInfracostInputSchema = commandToolInputSchema;
export type RunInfracostInput = CommandToolInput;

export const runInfracostTool: ToolDefinition<RunInfracostInput> = {
  name: "run_infracost",
  description: "Run infracost breakdown for a Terraform directory.",
  inputSchema: runInfracostInputSchema,
  inputSchemaJson: commandToolInputJsonSchema,
  run: async (input) => {
    try {
      const result = await runCommand(
        "infracost",
        ["breakdown", "--path", input.path, "--format", "json", ...input.extraArgs],
        {
          timeoutMs: input.timeoutMs
        }
      );
      return formatCommandExecution(result);
    } catch (error) {
      if (error instanceof CommandNotFoundError) {
        return missingCliMessage("infracost");
      }
      throw error;
    }
  }
};
