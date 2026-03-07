import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { allTools } from "./tools/index.js";

const server = new Server(
  {
    name: "terraform-best-practices-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const toolMap = new Map(allTools.map((tool) => [tool.name, tool]));

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchemaJson
    }))
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolMap.get(request.params.name);

  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
  }

  const parsed = tool.inputSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "input";
        return `${path}: ${issue.message}`;
      })
      .join("; ");

    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Invalid arguments for ${tool.name}: ${issues}`
        }
      ]
    };
  }

  try {
    const text = await tool.run(parsed.data);
    return {
      content: [
        {
          type: "text",
          text
        }
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Tool execution failed: ${message}`
        }
      ]
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("terraform-best-practices-mcp running on stdio");
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`Fatal startup error: ${message}`);
  process.exit(1);
});
