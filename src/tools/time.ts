import { ToolDefinition } from '../agent/llm.js';

export interface ToolImplementation {
    definition: ToolDefinition;
    execute: (args: any, context?: { chatId: number }) => Promise<string> | string;
}

export const getCurrentTimeTool: ToolImplementation = {
    definition: {
        type: 'function',
        function: {
            name: 'get_current_time',
            description: 'Gets the current local date and time. Use this when the user asks for the current time or date.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },
    execute: () => {
        return new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }); // Or adjust timezone if needed
    }
};
