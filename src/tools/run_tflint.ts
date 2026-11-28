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

export const runTflintInputSchema = commandToolInputSchema;
export type RunTflintInput = CommandToolInput;

export const runTflintTool: ToolDefinition<RunTflintInput> = {
  name: "run_tflint",
  description: "Run tflint against a Terraform project directory.",
  inputSchema: runTflintInputSchema,
  inputSchemaJson: commandToolInputJsonSchema,
  run: async (input) => {
    const tempConfigDir = await mkdtemp(path.join(os.tmpdir(), "tflint-config-"));
    const trustedConfigPath = path.join(tempConfigDir, ".tflint.hcl");
    try {
      await writeFile(trustedConfigPath, "", "utf8");
      const result = await runCommand("tflint", ["--config", trustedConfigPath, ...input.extraArgs], {
        cwd: input.path,
        timeoutMs: input.timeoutMs
      });
      return formatCommandExecution(result);
    } catch (error) {
      if (error instanceof CommandNotFoundError) {
        return missingCliMessage("tflint");
      }
      throw error;
    } finally {
      await rm(tempConfigDir, { recursive: true, force: true });
    }
  }
};
