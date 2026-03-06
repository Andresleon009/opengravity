import { config } from '../config.js';
import { bot } from './bot.js';
export { bot };
import { runAgentLoop } from '../agent/loop.js';
import { memory } from '../memory/db.js';

// Global error handler for the bot
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`❌ Error al procesar update ${ctx.update.update_id}:`, err.error);
});

// Middleware to restrict access to trusted users
bot.use(async (ctx, next) => {
    if (!ctx.from) return;
    const userId = ctx.from.id;

    if (!config.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
        console.warn(`⚠️ Bloqueado acceso no autorizado del usuario ID: ${userId} (@${ctx.from.username || 'unknown'})`);
        // If not allowed, we don't even say anything to prevent spamming the bot
        return;
    }

    await next();
});

// Setup command
bot.command('start', async (ctx) => {
    await ctx.reply('🚀 OpenGravity inicializado. Soy tu agente personal, ¿en qué te puedo ayudar?');
});

// Clear memory command
bot.command('clear', async (ctx) => {
    if (ctx.chat) {
        await memory.clearMemory(ctx.chat.id);
        await ctx.reply('🧠 Memoria de la conversación borrada en Firebase.');
    }
});

// Main message handler
bot.on('message:text', async (ctx) => {
    const userMessage = ctx.message.text;
    const chatId = ctx.chat.id;
    console.log(`📩 [${chatId}] Mensaje recibido: "${userMessage}"`);

    // Send a typing action to let the user know the agent is thinking
    try {
        await ctx.replyWithChatAction('typing');
    } catch (e) {
        // Ignore typing action errors
    }

    try {
        console.log(`🤖 [${chatId}] Procesando con agente...`);
        const reply = await runAgentLoop(chatId, userMessage);

        if (!reply || reply.trim().length === 0) {
            console.warn(`⚠️ [${chatId}] El agente devolvió una respuesta vacía.`);
            await ctx.reply('Lo siento, no pude generar una respuesta clara. ¿Puedes repetir?');
            return;
        }

        console.log(`✅ [${chatId}] Enviando respuesta: "${reply.substring(0, 50)}..."`);
        await ctx.reply(reply, { parse_mode: 'Markdown' });
    } catch (error: any) {
        console.error(`❌ [${chatId}] Agent loop error:`, error);
        await ctx.reply(`⚠️ Ocurrió un error al procesar tu solicitud: ${error.message}`);
    }
});

// Catch all for non-text messages
bot.on('message', async (ctx) => {
    if (!ctx.message?.text) {
        console.log(`ℹ️ [${ctx.chat.id}] Recibido mensaje no textual (ignorado por ahora).`);
    }
});
