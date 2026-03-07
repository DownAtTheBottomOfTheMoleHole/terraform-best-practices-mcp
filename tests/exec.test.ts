import { describe, expect, it } from "vitest";
import { CommandNotFoundError, runCommand } from "../src/lib/exec.js";

describe("runCommand", () => {
  it("runs a process and captures output", async () => {
    const result = await runCommand(process.execPath, ["-e", "console.log('ok')"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ok");
    expect(result.timedOut).toBe(false);
  });

  it("throws CommandNotFoundError when the executable is missing", async () => {
    await expect(runCommand("__missing_binary_for_test__", [])).rejects.toBeInstanceOf(
      CommandNotFoundError
    );
  });

  it("marks commands as timed out when they exceed timeout", async () => {
    const result = await runCommand(process.execPath, ["-e", "setTimeout(() => {}, 2000)"], {
      timeoutMs: 50
    });

    expect(result.timedOut).toBe(true);
  });
});
