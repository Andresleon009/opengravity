import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env relative to the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const configSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().min(1, 'Telegram bot token is required'),
    TELEGRAM_ALLOWED_USER_IDS: z.string()
        .transform((val) => val.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))),
    GROQ_API_KEY: z.string().min(1, 'Groq API key is required'),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default('openrouter/free'),
    DB_PATH: z.string().default('./memory.db'),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().default('./service-account.json'),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_DATABASE_URL: z.string().optional(),
});

const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
    console.error('❌ Invalid environment variables:', parsedConfig.error.format());
    process.exit(1);
}

export const config = parsedConfig.data;
