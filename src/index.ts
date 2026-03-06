import { bot } from './bot/telegram.js';
import { memory } from './memory/db.js';
import http from 'http';

async function bootstrap() {
    console.log('🚀 Inicializando OpenGravity con Firebase...');
    console.log('💾 Conexión a memoria (Realtime Database) inicializada.');

    // Simple HTTP server for Render health check
    const port = process.env.PORT || 3000;
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OpenGravity is running\n');
    }).listen(port, () => {
        console.log(`🌐 Servidor de salud activo en puerto ${port}`);
    });

    // Start polling
    bot.start({
        onStart: (botInfo) => {
            console.log(`✅ Bot Telegram conectado como @${botInfo.username}`);
        },
    });

    // Handle graceful shutdown
    process.once('SIGINT', () => {
        bot.stop();
        console.log('🛑 OpenGravity detenido.');
    });
    process.once('SIGTERM', () => {
        bot.stop();
        console.log('🛑 OpenGravity detenido.');
    });
}

bootstrap().catch(error => {
    console.error('❌ Error crítico:', error);
    process.exit(1);
});
