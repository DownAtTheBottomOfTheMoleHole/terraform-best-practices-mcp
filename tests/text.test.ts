import { describe, expect, it } from "vitest";
import { toPlainText } from "../src/lib/text.js";

describe("toPlainText", () => {
  it("decodes regular HTML entities", () => {
    expect(toPlainText("Tom &amp; &quot;Jerry&quot; and Bob&#39;s")).toBe("Tom & \"Jerry\" and Bob's");
  });

  it("does not double-unescape nested entities", () => {
    expect(toPlainText("&amp;quot; &amp;#39;")).toBe("&quot; &#39;");
  });

  it("removes script and style content when end tags contain parser-tolerated syntax", () => {
    const input =
      '<p>safe</p><script>alert("xss")</script foo="bar"><style>body{color:red}</style >after';

    const output = toPlainText(input);

    expect(output).toBe("safe after");
    expect(output).not.toContain("alert");
    expect(output).not.toContain("color:red");
  });
});
