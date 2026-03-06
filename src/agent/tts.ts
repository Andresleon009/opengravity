import { config } from '../config.js';

export async function generateSpeech(text: string): Promise<Buffer> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${config.ELEVENLABS_VOICE_ID}`;

    console.log(`📡 Llamando a ElevenLabs para: "${text.substring(0, 30)}..."`);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': config.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ElevenLabs API error (${response.status}):`, errorText);
        throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log('✅ Audio generado correctamente de ElevenLabs.');
    return Buffer.from(arrayBuffer);
}
