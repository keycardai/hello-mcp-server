import type { McpServer, AuthenticatedToolHandlerNoArgs } from "../types/index";
import { parseJWTPayload } from "../types/index";

export function registerWhoamiTool(mcpServer: McpServer): void {
  mcpServer.registerTool(
    "whoami",
    {
      title: "Who am I?",
      description: "Get detailed information about the authenticated user and their access token",
    },
    async ({ authInfo }: AuthenticatedToolHandlerNoArgs) => {
      if (!authInfo) {
        return { 
          content: [{ 
            type: "text", 
            text: "❌ No authentication information available. Please ensure you're properly authenticated." 
          }] 
        };
      }

      let userInfo = "🔐 Authentication Information:\n";
      userInfo += `• Client ID: ${authInfo.clientId || "N/A"}\n`;
      userInfo += `• Resource: ${authInfo.resource?.toString() || "N/A"}\n`;
      userInfo += `• Scopes: ${authInfo.scopes ? authInfo.scopes.join(", ") || "None" : "N/A"}\n`;
      userInfo += `• Token Present: ${authInfo.token ? "✅ Yes" : "❌ No"}\n`;

      // Try to decode the JWT manually from the token
      let jwtPayload = parseJWTPayload(authInfo.extra);
      
      // If not in extra, try to decode from the raw token
      if (!jwtPayload && authInfo.token) {
        try {
          // JWT tokens have 3 parts separated by dots
          const tokenParts = authInfo.token.split('.');
          if (tokenParts.length === 3) {
            // Decode the payload (middle part)
            const payloadBase64 = tokenParts[1];
            // Add padding if necessary
            const paddedPayload = payloadBase64 + '='.repeat((4 - payloadBase64.length % 4) % 4);
            const decodedPayload = JSON.parse(atob(paddedPayload));
            jwtPayload = parseJWTPayload(decodedPayload);
          }
        } catch (error) {
          console.warn('Failed to manually decode JWT:', error);
        }
      }
      
      if (jwtPayload) {
        userInfo += `\n👤 User Information (from JWT):\n`;
        userInfo += `• Subject ID: ${jwtPayload.sub || "N/A"}\n`;
        userInfo += `• Issuer: ${jwtPayload.iss || "N/A"}\n`;
        userInfo += `• Audience: ${jwtPayload.aud || "N/A"}\n`;
        userInfo += `• Client ID (JWT): ${jwtPayload.client_id || "N/A"}\n`;
        
        if (jwtPayload.exp) {
          const expiryDate = new Date(jwtPayload.exp * 1000);
          const now = new Date();
          const timeLeft = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000 / 60));
          userInfo += `• Token Expires: ${expiryDate.toLocaleString()} (${timeLeft} min remaining)\n`;
        }
        
        if (jwtPayload.iat) {
          const issuedDate = new Date(jwtPayload.iat * 1000);
          userInfo += `• Token Issued: ${issuedDate.toLocaleString()}\n`;
        }

        const standardClaims = ['sub', 'iss', 'aud', 'client_id', 'exp', 'iat', 'nbf', 'jti'];
        const customClaims = Object.keys(jwtPayload).filter(key => !standardClaims.includes(key));
        if (customClaims.length > 0) {
          userInfo += `\n🏷️  Custom Claims:\n`;
          customClaims.forEach(claim => {
            userInfo += `• ${claim}: ${jwtPayload[claim as keyof typeof jwtPayload]}\n`;
          });
        }
      } else {
        userInfo += `\n❌ No valid JWT payload available in 'extra' field.\n`;
        userInfo += `💡 This might indicate an issue with token parsing or an unsupported token format.\n`;
      }

      return { 
        content: [{ 
          type: "text", 
          text: userInfo 
        }] 
      };
    }
  );
}