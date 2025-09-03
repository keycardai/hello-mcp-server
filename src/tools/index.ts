import type { McpServer } from "../types/index";
import { registerLogoTool } from "./logo";
import { registerWhoamiTool } from "./whoami";

/**
 * Tool registry - maps tool names to their registration functions
 */
const TOOL_REGISTRY = [
  { name: "keycard-logo", register: registerLogoTool },
  { name: "whoami", register: registerWhoamiTool },
] as const;

/**
 * Get list of all available tool names
 */
export function getAvailableToolNames(): string[] {
  return TOOL_REGISTRY.map(tool => tool.name);
}

/**
 * Registers all MCP tools with the server
 *
 * This function serves as the central registry for all tools provided
 * by the Keycard Hello MCP server. It demonstrates the recommended
 * pattern for organizing tools in a modular MCP server.
 *
 * @param mcpServer - The MCP server instance to register tools with
 */
export function registerAllTools(mcpServer: McpServer): void {
  // Register all tools from the registry
  TOOL_REGISTRY.forEach(({ register }) => {
    register(mcpServer);
  });
}