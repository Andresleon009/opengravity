import { Bot } from 'grammy';
import { config } from '../config.js';
import { runAgentLoop } from '../agent/loop.js';
import { memory } from '../memory/db.js';

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

// Middleware to restrict access to trusted users
bot.use(async (ctx, next) => {
    if (!ctx.from) return;
    const userId = ctx.from.id;

    if (!config.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
        console.warn(`⚠️ Bloqueado acceso no autorizado del usuario ID: ${userId}`);
        return; // Ignore message completely
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

    // Send a typing action to let the user know the agent is thinking
    await ctx.replyWithChatAction('typing');

    try {
        const reply = await runAgentLoop(chatId, userMessage);
        await ctx.reply(reply, { parse_mode: 'Markdown' });
    } catch (error: any) {
        console.error('❌ Agent loop error:', error);
        await ctx.reply(`⚠️ Ocurrió un error al procesar tu solicitud: ${error.message}`);
    }
});
