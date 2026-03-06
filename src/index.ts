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
    const stopBot = async () => {
        console.log('🛑 Deteniendo OpenGravity...');
        await bot.stop();
        console.log('🛑 OpenGravity detenido.');
        process.exit(0);
    };

    process.once('SIGINT', stopBot);
    process.once('SIGTERM', stopBot);
}

bootstrap().catch(error => {
    console.error('❌ Error crítico al iniciar:', error);
    process.exit(1);
});
