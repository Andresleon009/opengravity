import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env relative to the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Helper to strip quotes from env strings (common when copying from .env to Render)
const stripQuotes = (val: string | undefined) => val?.replace(/^["']|["']$/g, '') || val;

const configSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().transform(stripQuotes).pipe(z.string().min(1, 'Telegram bot token is required')),
    TELEGRAM_ALLOWED_USER_IDS: z.string()
        .transform(stripQuotes)
        .transform((val) => val?.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) || []),
    GROQ_API_KEY: z.string().transform(stripQuotes).pipe(z.string().min(1, 'Groq API key is required')),
    OPENROUTER_API_KEY: z.string().transform(stripQuotes).optional(),
    OPENROUTER_MODEL: z.string().transform(stripQuotes).default('openrouter/free'),
    DB_PATH: z.string().transform(stripQuotes).default('./memory.db'),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().transform(stripQuotes).default('./service-account.json'),
    FIREBASE_PROJECT_ID: z.string().transform(stripQuotes).optional(),
    FIREBASE_DATABASE_URL: z.string().transform(stripQuotes).optional(),
    ELEVENLABS_API_KEY: z.string().transform(stripQuotes).optional(),
    ELEVENLABS_VOICE_ID: z.string().transform(stripQuotes).optional().default('ErXw7e3v81Krt3o69G24'),
});

const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(parsedConfig.error.format(), null, 2));
    process.exit(1);
}

export const config = parsedConfig.data;
