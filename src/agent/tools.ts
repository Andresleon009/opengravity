import { getCurrentTimeTool } from '../tools/time.js';
import { speakTool } from '../tools/speak.js';
import { gmailSearchTool } from '../tools/gmail.js';
import { calendarEventsTool } from '../tools/calendar.js';
import { driveSearchTool } from '../tools/drive.js';
import { ToolImplementation } from '../tools/time.js';

// Map of all available tools
const availableTools: Record<string, ToolImplementation> = {
  'get_current_time': getCurrentTimeTool,
  'speak_message': speakTool,
  'gmail_search_emails': gmailSearchTool,
  'calendar_list_events': calendarEventsTool,
  'drive_search_files': driveSearchTool,
};

export function getToolDefinitions() {
  return Object.values(availableTools).map(t => t.definition);
}

export async function executeToolCall(name: string, argsRaw: string, chatId: number): Promise<string> {
  const tool = availableTools[name];

  if (!tool) {
    return `Error: Tool "${name}" not found.`;
  }

  try {
    const args = argsRaw ? JSON.parse(argsRaw) : {};
    return await tool.execute(args, { chatId });
  } catch (error: any) {
    console.error(`❌ Error executing tool ${name}:`, error);
    return `Error executing tool: ${error.message || 'Unknown error'}`;
  }
}
