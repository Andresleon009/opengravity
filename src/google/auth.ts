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
        if (!fs.existsSync(TOKEN_PATH)) return null;
        const content = fs.readFileSync(TOKEN_PATH, 'utf8');
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials) as OAuth2Client;
    } catch (err) {
        return null;
    }
}

async function saveCredentials(client: OAuth2Client) {
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    fs.writeFileSync(TOKEN_PATH, payload);
}

export async function authorize(): Promise<OAuth2Client> {
    let savedClient = await loadSavedCredentialsIfExist();
    if (savedClient) {
        return savedClient;
    }

    const client_config = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id } = client_config.installed || client_config.web;

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
