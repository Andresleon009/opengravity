import { google } from 'googleapis';
import { authorize } from '../google/auth.js';
import { ToolImplementation } from './time.js';

export const driveSearchTool: ToolImplementation = {
    definition: {
        type: 'function',
        function: {
            name: 'drive_search_files',
            description: 'Search for files or notes in the user\'s Google Drive account based on a query.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The query to search for (e.g., "name contains \'note\'", "mimeType = \'application/vnd.google-apps.document\'").'
                    }
                },
                required: ['query']
            }
        }
    },
    execute: async (args: { query: string }) => {
        try {
            console.log(`📂 Buscando en Drive: "${args.query}"`);
            const auth = await authorize();
            const drive = google.drive({ version: 'v3', auth });

            const res = await drive.files.list({
                pageSize: 10,
                q: args.query,
                fields: 'nextPageToken, files(id, name, mimeType, webViewLink)'
            });

            if (!res.data.files || res.data.files.length === 0) {
                return 'No se encontraron archivos en Drive para esa búsqueda.';
            }

            const fileList = res.data.files.map((file) => {
                return `- Archivo: ${file.name}\n  Tipo: ${file.mimeType}\n  Enlace: ${file.webViewLink}`;
            });

            return `Archivos encontrados:\n${fileList.join('\n\n')}`;
        } catch (error: any) {
            console.error('❌ Error en drive_search_files:', error);
            return `Error buscando archivos en Drive: ${error.message}`;
        }
    }
};
