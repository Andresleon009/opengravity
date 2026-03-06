import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import url from 'url';

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

async function loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
    try {
        // 1. Check if token is in environment variable (for Render/Cloud)
        if (process.env.GOOGLE_TOKEN) {
            const credentials = JSON.parse(process.env.GOOGLE_TOKEN);
            return google.auth.fromJSON(credentials) as OAuth2Client;
        }

        // 2. Fallback to local file
        if (!fs.existsSync(TOKEN_PATH)) return null;
        const content = fs.readFileSync(TOKEN_PATH, 'utf8');
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials) as OAuth2Client;
    } catch (err) {
        return null;
    }
}

async function saveCredentials(client: OAuth2Client) {
    // If using environment variables for client credentials, we might not have a local credentials.json
    // In this case, we should ensure we have the client_id and client_secret to save the token.
    let client_id: string | undefined;
    let client_secret: string | undefined;

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        client_id = process.env.GOOGLE_CLIENT_ID;
        client_secret = process.env.GOOGLE_CLIENT_SECRET;
    } else if (fs.existsSync(CREDENTIALS_PATH)) {
        const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
        const keys = JSON.parse(content);
        const key = keys.installed || keys.web;
        client_id = key.client_id;
        client_secret = key.client_secret;
    } else {
        console.error('No client_id or client_secret found to save credentials.');
        return; // Cannot save without client details
    }

    if (!client_id || !client_secret) {
        console.error('Missing client_id or client_secret to save credentials.');
        return;
    }

    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: client_id,
        client_secret: client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    fs.writeFileSync(TOKEN_PATH, payload);
}

export async function authorize(): Promise<OAuth2Client> {
    let savedClient = await loadSavedCredentialsIfExist();
    if (savedClient) {
        return savedClient;
    }

    let client_id: string;
    let client_secret: string;

    // If no saved client, we need credentials to start OAuth flow
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        client_id = process.env.GOOGLE_CLIENT_ID;
        client_secret = process.env.GOOGLE_CLIENT_SECRET;
    } else if (fs.existsSync(CREDENTIALS_PATH)) {
        const client_config = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
        const keys = client_config.installed || client_config.web;
        client_id = keys.client_id;
        client_secret = keys.client_secret;
    } else {
        throw new Error('No se encontró credentials.json ni GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET en el entorno.');
    }

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3001');

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    fs.writeFileSync('auth_url.txt', authUrl);

    console.log('\n====================================================');
    console.log('🔗 URL GUARDADA EN auth_url.txt');
    console.log('====================================================\n');

    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            try {
                const parsedUrl = url.parse(req.url || '', true);
                if (parsedUrl.query && parsedUrl.query.code) {
                    const code = parsedUrl.query.code as string;
                    res.end('<h1>¡Autorización completa!</h1><p>Ya puedes cerrar esta ventana y volver a Telegram.</p>');
                    server.close();
                    const { tokens } = await oAuth2Client.getToken(code);
                    oAuth2Client.setCredentials(tokens);
                    await saveCredentials(oAuth2Client);
                    console.log('✅ Credenciales guardadas correctamente.');
                    resolve(oAuth2Client);
                }
            } catch (e) {
                reject(e);
            }
        }).listen(3001);
    });
}
