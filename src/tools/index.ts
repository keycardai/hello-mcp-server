import type { McpServer } from "../types/index";
import { registerLogoTool } from "./logo";
import { registerWhoamiTool } from "./whoami";

/**
 * Registers all MCP tools with the server
 *
 * This function serves as the central registry for all tools provided
 * by the Keycard Hello MCP server. It demonstrates the recommended
 * pattern for organizing tools in a modular MCP server.
 *
 *
 * @param mcpServer - The MCP server instance to register tools with
 */
export function registerAllTools(mcpServer: McpServer): void {
  registerLogoTool(mcpServer);
  registerWhoamiTool(mcpServer);
}