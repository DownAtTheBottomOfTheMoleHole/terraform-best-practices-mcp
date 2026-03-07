import { z } from "zod";
import type { CommandExecutionResult } from "../lib/exec.js";

export const commandToolInputSchema = z.object({
  path: z.string().min(1).default("."),
  extraArgs: z.array(z.string().min(1)).max(50).default([]),
  timeoutMs: z.number().int().positive().max(600_000).optional()
});

export type CommandToolInput = z.infer<typeof commandToolInputSchema>;

export const commandToolInputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Terraform project path to scan.",
      default: "."
    },
    extraArgs: {
      type: "array",
      items: {
        type: "string"
      },
      description: "Extra CLI arguments.",
      default: []
    },
    timeoutMs: {
      type: "integer",
      description: "Optional command timeout in milliseconds.",
      minimum: 1,
      maximum: 600000
    }
  },
  additionalProperties: false
};

const installHints: Record<string, string> = {
  tflint: "Install tflint from https://github.com/terraform-linters/tflint and ensure `tflint` is on PATH.",
  checkov: "Install checkov with `pip install checkov` and ensure `checkov` is on PATH.",
  trivy: "Install trivy from https://github.com/aquasecurity/trivy and ensure `trivy` is on PATH.",
  kics: "Install kics from https://github.com/Checkmarx/kics and ensure `kics` is on PATH.",
  infracost: "Install infracost from https://www.infracost.io/docs/ and ensure `infracost` is on PATH."
};

export function missingCliMessage(command: keyof typeof installHints): string {
  return [`Required CLI not found: ${command}`, installHints[command]].join("\n");
}

export function formatCommandExecution(result: CommandExecutionResult): string {
  const lines: string[] = [
    `Command: ${result.command} ${result.args.join(" ")}`.trim(),
    `Working directory: ${result.cwd}`,
    `Exit code: ${result.exitCode}`,
    `Timed out: ${result.timedOut ? "yes" : "no"}`,
    `Output truncated: ${result.outputTruncated ? "yes" : "no"}`
  ];

  if (result.stdout) {
    lines.push("", "stdout:", result.stdout);
  }

  if (result.stderr) {
    lines.push("", "stderr:", result.stderr);
  }

  if (!result.stdout && !result.stderr) {
    lines.push("", "No command output was produced.");
  }

  return lines.join("\n");
}
