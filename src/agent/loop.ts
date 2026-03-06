import { generateCompletion, ChatMessage } from './llm.js';
import { getToolDefinitions, executeToolCall } from './tools.js';
import { memory } from '../memory/db.js';

const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `Eres OpenGravity, un asistente de IA personal.
Eres conciso, directo, y útil. Respondes SIEMPRE en el mismo idioma que el usuario, preferiblemente en español si no se especifica.
Tienes acceso a herramientas.`;

export async function runAgentLoop(chatId: number, userMessage: string): Promise<string> {
    // 1. Save user message to memory
    await memory.addMessage({
        chat_id: chatId,
        role: 'user',
        content: userMessage,
    });

    // 2. Fetch conversation history
    const historyRaw = await memory.getMessages(chatId, 20); // Get last 20 messages for context

    const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT }
    ];

    for (const msg of historyRaw) {
        const chatMsg: ChatMessage = {
            role: msg.role,
            content: msg.content,
        };
        if (msg.tool_call_id) chatMsg.tool_call_id = msg.tool_call_id;
        if (msg.tool_calls) chatMsg.tool_calls = JSON.parse(msg.tool_calls);
        messages.push(chatMsg);
    }

    const tools = getToolDefinitions();
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
        iterations++;

        // 3. Call LLM
        const response = await generateCompletion(messages, tools);
        const { message, finish_reason } = response;

        // Save assistant message to memory and context
        await memory.addMessage({
            chat_id: chatId,
            role: 'assistant',
            content: message.content || '',
            tool_calls: message.tool_calls ? JSON.stringify(message.tool_calls) : null,
        });
        messages.push(message);

        // 4. Check for tool calls
        if (finish_reason === 'tool_calls' && message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                const result = await executeToolCall(toolCall.function.name, toolCall.function.arguments);

                const toolMsg: ChatMessage = {
                    role: 'tool',
                    content: result,
                    tool_call_id: toolCall.id,
                };

                // Save tool result to memory and context
                await memory.addMessage({
                    chat_id: chatId,
                    role: 'tool',
                    content: toolMsg.content,
                    tool_call_id: toolMsg.tool_call_id,
                });
                messages.push(toolMsg);
            }
            // Loop continues, model will process tool results
        } else {
            // 5. Final response
            return message.content || 'Sin respuesta.';
        }
    }

    return "He alcanzado el límite máximo de pensamiento para esta solicitud. Por favor intenta de nuevo.";
}
