import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 2_000_000;

export interface CommandExecutionOptions {
  cwd?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  env?: NodeJS.ProcessEnv;
}

export interface CommandExecutionResult {
  command: string;
  args: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  outputTruncated: boolean;
}

export class CommandNotFoundError extends Error {
  constructor(command: string) {
    super(`Command not found: ${command}`);
    this.name = "CommandNotFoundError";
  }
}

export async function runCommand(
  command: string,
  args: string[],
  options: CommandExecutionOptions = {}
): Promise<CommandExecutionResult> {
  const cwd = options.cwd ?? process.cwd();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

  return await new Promise<CommandExecutionResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: options.env ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputTruncated = false;
    let killIssued = false;
    let settled = false;

    const finish = (done: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      done();
    };

    const stopProcess = (): void => {
      if (killIssued || child.killed) {
        return;
      }
      killIssued = true;
      child.kill("SIGTERM");
    };

    const appendOutput = (current: string, chunk: string | Buffer): string => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      const next = current + text;
      if (Buffer.byteLength(next, "utf8") > maxOutputBytes) {
        outputTruncated = true;
        stopProcess();
        return next.slice(0, maxOutputBytes);
      }
      return next;
    };

    const timer = setTimeout(() => {
      timedOut = true;
      stopProcess();
    }, timeoutMs);

    child.stdout?.on("data", (chunk: string | Buffer) => {
      stdout = appendOutput(stdout, chunk);
    });

    child.stderr?.on("data", (chunk: string | Buffer) => {
      stderr = appendOutput(stderr, chunk);
    });

    child.once("error", (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(new CommandNotFoundError(command));
          return;
        }
        reject(error);
      });
    });

    child.once("close", (code) => {
      finish(() => {
        resolve({
          command,
          args,
          cwd,
          exitCode: code ?? -1,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timedOut,
          outputTruncated
        });
      });
    });
  });
}
