import { ToolImplementation } from './time.js';
import { generateSpeech } from '../agent/tts.js';
import { bot } from '../bot/bot.js';
import { InputFile } from 'grammy';

export const speakTool: ToolImplementation = {
    definition: {
        type: 'function',
        function: {
            name: 'speak_message',
            description: 'Convert text to speech and send it as an audio message/voice note. Use this ONLY when the user explicitly asks you to speak, send an audio, or respond with voice. ALWAYS specify the exact text you want to say in Spanish.',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'The text to convert to audio (in Spanish).'
                    }
                },
                required: ['text']
            }
        }
    },
    execute: async (args: { text: string }, context?: { chatId: number }) => {
        if (!context?.chatId) {
            return 'Error: No chatId provided.';
        }

        try {
            console.log(`🎙️ Generando audio para: "${args.text.substring(0, 30)}..."`);
            const audioBuffer = await generateSpeech(args.text);

            await bot.api.sendVoice(context.chatId, new InputFile(audioBuffer, 'voice.ogg'));

            return `Audio enviado con éxito: "${args.text}"`;
        } catch (error: any) {
            console.error('❌ Error en speak_message:', error);
            return `Error al generar el audio: ${error.message}`;
        }
    }
};
