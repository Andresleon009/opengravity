import * as googleTTS from 'google-tts-api';
import { config } from '../config.js';

export async function generateSpeech(text: string): Promise<Buffer> {
    console.log(`📡 Generando voz gratis (Google Translate) para: "${text.substring(0, 30)}..."`);

    try {
        // This generates a URL for the Google Translate TTS engine
        // No API KEY required, No Credit Card required
        const results = googleTTS.getAllAudioUrls(text, {
            lang: 'es',
            slow: false,
            host: 'https://translate.google.com',
            splitPunct: ' '
        });

        // Fetch all audio chunks (usually only 1 for short messages)
        const audioBuffers = await Promise.all(
            results.map(async (item) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
                try {
                    const response = await fetch(item.url, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error(`Google TTS Error: ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    return Buffer.from(arrayBuffer);
                } catch (err) {
                    clearTimeout(timeoutId);
                    throw err;
                }
            })
        );

        // Concatenate all buffers
        const finalBuffer = Buffer.concat(audioBuffers);

        console.log('✅ Audio generado correctamente (Voz gratuita).');
        return finalBuffer;
    } catch (error: any) {
        console.error('❌ Error en Voz Gratuita:', error);
        throw new Error(`Error generando voz gratuita: ${error.message}`);
    }
}
