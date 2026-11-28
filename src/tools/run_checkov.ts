import { CommandNotFoundError, runCommand } from "../lib/exec.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
    const tempConfigDir = await mkdtemp(path.join(os.tmpdir(), "checkov-config-"));
    const trustedConfigPath = path.join(tempConfigDir, ".checkov.yaml");
    try {
      await writeFile(trustedConfigPath, "{}\n", "utf8");
      const result = await runCommand(
        "checkov",
        ["-d", input.path, "--config-file", trustedConfigPath, ...input.extraArgs],
        {
          timeoutMs: input.timeoutMs
        }
      );
      return formatCommandExecution(result);
    } catch (error) {
      if (error instanceof CommandNotFoundError) {
        return missingCliMessage("checkov");
      }
      throw error;
    } finally {
      await rm(tempConfigDir, { recursive: true, force: true });
    }
  }
};
