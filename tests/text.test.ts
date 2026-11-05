import { describe, expect, it } from "vitest";
import { toPlainText } from "../src/lib/text.js";

describe("toPlainText", () => {
  it("removes script and style content when end tags contain parser-tolerated syntax", () => {
    const input =
      '<p>safe</p><script>alert("xss")</script foo="bar"><style>body{color:red}</style >after';

    const output = toPlainText(input);

    expect(output).toBe("safe after");
    expect(output).not.toContain("alert");
    expect(output).not.toContain("color:red");
  });
});
