import { generateCompletion, ChatMessage } from './llm.js';
import { getToolDefinitions, executeToolCall } from './tools.js';
import { memory } from '../memory/db.js';

const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `Eres OpenGravity, un asistente de IA personal. 
Eres conciso, directo, y útil. Respondes SIEMPRE en el mismo idioma que el usuario, preferiblemente en español si no se especifica.
Tienes acceso a herramientas:
- 'speak_message': Úsala si el usuario pide notas de voz o audio.
- 'gmail_search_emails': Úsala para buscar correos en Gmail.
- 'calendar_list_events': Úsala para ver eventos próximos del calendario.
- 'drive_search_files': Úsala para buscar archivos o documentos en Drive.
Si el usuario te pregunta por sus correos, citas o archivos, usa la herramienta correspondiente o búscalos.`;

export async function runAgentLoop(chatId: number, userMessage: string): Promise<string> {
    try {
        // 1. Save user message to memory
        await memory.addMessage({
            chat_id: chatId,
            role: 'user',
            content: userMessage,
        });

        // 2. Fetch conversation history
        const historyRaw = await memory.getMessages(chatId, 20);

        const messages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT.trim() }
        ];

        for (const msg of historyRaw) {
            const chatMsg: ChatMessage = {
                role: msg.role as any,
                content: msg.content || '',
            };
            if (msg.tool_call_id) chatMsg.tool_call_id = msg.tool_call_id;
            if (msg.tool_calls) {
                try {
                    chatMsg.tool_calls = typeof msg.tool_calls === 'string' ? JSON.parse(msg.tool_calls) : msg.tool_calls;
                } catch (e) {
                    // console.error('❌ Error parsing tool_calls from history:', e);
                }
            }
            messages.push(chatMsg);
        }

        const tools = getToolDefinitions();
        let iterations = 0;

        while (iterations < MAX_ITERATIONS) {
            iterations++;

            // 3. Call LLM
            console.log(`🧠 Llamando a LLM (Iteración ${iterations})...`);
            const response = await generateCompletion(messages, tools);
            const { message, finish_reason } = response;

            // Ensure content is at least an empty string
            if (message.content === null || message.content === undefined) {
                message.content = '';
            }

            // Save assistant message to memory and context
            await memory.addMessage({
                chat_id: chatId,
                role: 'assistant',
                content: message.content || '',
                tool_calls: message.tool_calls ? JSON.stringify(message.tool_calls) : null,
            });
            messages.push(message);

            // 4. Check for tool calls
            if (finish_reason === 'tool_calls' && message.tool_calls && message.tool_calls.length > 0) {
                console.log(`🛠️ El modelo solicitó ${message.tool_calls.length} herramientas.`);
                for (const toolCall of message.tool_calls) {
                    const result = await executeToolCall(toolCall.function.name, toolCall.function.arguments, chatId);

                    const toolMsg: ChatMessage = {
                        role: 'tool',
                        content: String(result), // Ensure it's a string
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
                // Loop continues to generate a response based on tool output
            } else {
                // 5. Final response
                const finalReply = message.content || 'Hecho.';
                console.log(`✨ Respuesta final lista: "${finalReply.substring(0, 50)}..."`);
                return finalReply;
            }
        }

        return "He alcanzado el límite máximo de pensamiento para esta solicitud. Por favor intenta de nuevo.";
    } catch (error: any) {
        console.error('❌ Error crítico en runAgentLoop:', error);
        throw error;
    }
}
