import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { config } from '../config.js';

// Initialize the Google Text-to-Speech client
// It will automatically use the credentials from GOOGLE_APPLICATION_CREDENTIALS env var
const client = new TextToSpeechClient();

export async function generateSpeech(text: string): Promise<Buffer> {
    console.log(`📡 Llamando a Google Cloud TTS para: "${text.substring(0, 30)}..."`);

    try {
        const request = {
            input: { text },
            voice: {
                languageCode: 'es-ES',
                name: 'es-ES-Standard-A', // Neutral female Spanish voice
                ssmlGender: 'FEMALE' as const
            },
            audioConfig: {
                audioEncoding: 'OGG_OPUS' as const
            },
        };

        const [response] = await client.synthesizeSpeech(request);

        if (!response.audioContent) {
            throw new Error('Google TTS no devolvió contenido de audio.');
        }

        console.log('✅ Audio generado correctamente con Google Cloud TTS.');
        return Buffer.from(response.audioContent);
    } catch (error: any) {
        console.error('❌ Google Cloud TTS Error:', error);

        // Fallback or better error message
        if (error.message.includes('Billing')) {
            throw new Error('Error: Es necesario habilitar la facturación en Google Cloud para usar la voz de Google.');
        }
        throw new Error(`Error en Google TTS: ${error.message}`);
    }
}
