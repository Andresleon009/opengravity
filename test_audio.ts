import { generateSpeech } from './src/agent/tts.js';
import dotenv from 'dotenv';
dotenv.config();

async function testAudio() {
    console.log('🧪 Probando generación de audio con ElevenLabs...');
    try {
        const buffer = await generateSpeech('Hola, esto es una prueba de audio para verificar si la integración con ElevenLabs sigue funcionando correctamente.');
        console.log(`✅ ¡Éxito! Audio generado. Tamaño: ${buffer.length} bytes.`);
    } catch (error: any) {
        console.error('❌ Error al generar audio:');
        console.error(error.message);
    }
}

testAudio();
