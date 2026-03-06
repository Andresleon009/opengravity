import { google } from 'googleapis';
import { authorize } from '../google/auth.js';
import { ToolImplementation } from './time.js';

export const gmailSearchTool: ToolImplementation = {
    definition: {
        type: 'function',
        function: {
            name: 'gmail_search_emails',
            description: 'Search for emails in the user\'s Gmail account based on a query.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The query to search for (e.g., "from:someone@example.com", "is:unread", "subject:meeting").'
                    }
                },
                required: ['query']
            }
        }
    },
    execute: async (args: { query: string }) => {
        try {
            console.log(`📧 Buscando correos: "${args.query}"`);
            const auth = await authorize();
            const gmail = google.gmail({ version: 'v1', auth });

            const res = await gmail.users.messages.list({
                userId: 'me',
                q: args.query,
                maxResults: 5
            });

            if (!res.data.messages || res.data.messages.length === 0) {
                return 'No se encontraron correos para esta búsqueda.';
            }

            const messageDetails = await Promise.all(
                res.data.messages.map(async (msg) => {
                    const detail = await gmail.users.messages.get({
                        userId: 'me',
                        id: msg.id!
                    });
                    const headers = detail.data.payload?.headers;
                    const subject = headers?.find(h => h.name === 'Subject')?.value || 'Sin asunto';
                    const from = headers?.find(h => h.name === 'From')?.value || 'Remitente desconocido';
                    const snippet = detail.data.snippet || '';
                    return `- De: ${from}, Asunto: ${subject}\n  Snippet: ${snippet}`;
                })
            );

            return `Encontrados: \n${messageDetails.join('\n\n')}`;
        } catch (error: any) {
            console.error('❌ Error en gmail_search_emails:', error);
            if (error.message.includes('authentication')) {
                return 'Error: Es necesario autenticar el bot en Google. Por favor, revisa la terminal del servidor.';
            }
            return `Error buscando correos: ${error.message}`;
        }
    }
};
