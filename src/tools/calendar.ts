import { google } from 'googleapis';
import { authorize } from '../google/auth.js';
import { ToolImplementation } from './time.js';

export const calendarEventsTool: ToolImplementation = {
    definition: {
        type: 'function',
        function: {
            name: 'calendar_list_events',
            description: 'List upcoming events from the user\'s Google Calendar.',
            parameters: {
                type: 'object',
                properties: {
                    maxResults: {
                        type: 'number',
                        description: 'Number of upcoming events to list (default is 10).'
                    }
                },
                required: []
            }
        }
    },
    execute: async (args: { maxResults?: number }) => {
        try {
            console.log(`📅 Listando próximos eventos del calendario...`);
            const auth = await authorize();
            const calendar = google.calendar({ version: 'v3', auth });

            const res = await calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults: args.maxResults || 10,
                singleEvents: true,
                orderBy: 'startTime'
            });

            const events = res.data.items;
            if (!events || events.length === 0) {
                return 'No hay eventos próximos en tu calendario.';
            }

            const eventList = events.map((event) => {
                const start = event.start?.dateTime || event.start?.date;
                return `- Evento: ${event.summary}\n  Fecha/Hora: ${start}\n  Enlace: ${event.htmlLink}`;
            });

            return `Próximos eventos:\n${eventList.join('\n\n')}`;
        } catch (error: any) {
            console.error('❌ Error en calendar_list_events:', error);
            return `Error listando eventos: ${error.message}`;
        }
    }
};
