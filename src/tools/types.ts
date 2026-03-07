import type { ZodTypeAny } from "zod";

export interface ToolDefinition<TInput = any> {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
  inputSchemaJson: Record<string, unknown>;
  run: (input: TInput) => Promise<string>;
}
