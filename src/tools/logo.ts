import type { McpServer } from "../types/index";

const KEYCARD_LOGO = `
██╗  ██╗███████╗██╗   ██╗ ██████╗ █████╗ ██████╗ ██████╗ 
██║ ██╔╝██╔════╝╚██╗ ██╔╝██╔════╝██╔══██╗██╔══██╗██╔══██╗
█████╔╝ █████╗   ╚████╔╝ ██║     ███████║██████╔╝██║  ██║
██╔═██╗ ██╔══╝    ╚██╔╝  ██║     ██╔══██║██╔══██╗██║  ██║
██║  ██╗███████╗   ██║   ╚██████╗██║  ██║██║  ██║██████╔╝
╚═╝  ╚═╝╚══════╝   ╚═╝    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ 
`;

export function registerLogoTool(mcpServer: McpServer): void {
  mcpServer.registerTool(
    "keycard-logo",
    {
      title: "Display Keycard Logo",
      description: "Displays the official Keycard ASCII art logo.",
    },
    async () => ({ 
      content: [{ 
        type: "text", 
        text: KEYCARD_LOGO 
      }] 
    })
  );
}