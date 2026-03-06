import { getCurrentTimeTool } from '../tools/time.js';
import { ToolImplementation } from '../tools/time.js'; // type re-export if needed, or define in a common place

// Map of all available tools
const availableTools: Record<string, ToolImplementation> = {
  'get_current_time': getCurrentTimeTool,
};

export function getToolDefinitions() {
  return Object.values(availableTools).map(t => t.definition);
}

export async function executeToolCall(name: string, argsRaw: string): Promise<string> {
  const tool = availableTools[name];

  if (!tool) {
    return `Error: Tool "${name}" not found.`;
  }

  try {
    const args = argsRaw ? JSON.parse(argsRaw) : {};
    return await tool.execute(args);
  } catch (error: any) {
    console.error(`❌ Error executing tool ${name}:`, error);
    return `Error executing tool: ${error.message || 'Unknown error'}`;
  }
}
