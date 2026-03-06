import admin from 'firebase-admin';
import { config } from '../config.js';
import fs from 'fs';
import { join, isAbsolute } from 'path';

// Resolve service account path
const saPath = isAbsolute(config.GOOGLE_APPLICATION_CREDENTIALS)
  ? config.GOOGLE_APPLICATION_CREDENTIALS
  : join(process.cwd(), config.GOOGLE_APPLICATION_CREDENTIALS);

const initOptions: admin.AppOptions = {
  projectId: config.FIREBASE_PROJECT_ID,
  databaseURL: config.FIREBASE_DATABASE_URL
};

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    initOptions.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    admin.initializeApp(initOptions);
    console.log('✅ Firebase Admin SDK inicializado desde variable de entorno.');
  } catch (err) {
    console.error('❌ Error al parsear FIREBASE_SERVICE_ACCOUNT:', err);
    admin.initializeApp(initOptions);
  }
} else if (fs.existsSync(saPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  initOptions.credential = admin.credential.cert(serviceAccount);
  admin.initializeApp(initOptions);
  console.log('✅ Firebase Admin SDK (Realtime DB) inicializado con service-account.json');
} else {
  admin.initializeApp(initOptions);
  console.log('⚠️ service-account.json no encontrado. Usando credenciales por defecto / Project ID.');
}

const db = admin.database();

export interface MessageRow {
  id?: string;
  chat_id: number;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string | null;
  tool_calls?: string | null; // JSON string
  created_at?: number; // Unix timestamp
}

export const memory = {
  addMessage: async (message: MessageRow) => {
    try {
      const messagesRef = db.ref(`chats/${message.chat_id}/messages`);

      await messagesRef.push({
        role: message.role,
        content: message.content || '',
        tool_call_id: message.tool_call_id || null,
        tool_calls: message.tool_calls || null,
        created_at: admin.database.ServerValue.TIMESTAMP
      });

      return { lastInsertRowid: 0 };
    } catch (error) {
      console.error('❌ Error guardando en Realtime Database:', error);
      throw error;
    }
  },

  getMessages: async (chatId: number, limit: number = 50): Promise<MessageRow[]> => {
    try {
      const messagesRef = db.ref(`chats/${chatId}/messages`);

      const snapshot = await messagesRef
        .orderByChild('created_at')
        .limitToLast(limit)
        .once('value');

      const messages: MessageRow[] = [];
      snapshot.forEach((child) => {
        const data = child.val();
        messages.push({
          id: child.key as string,
          chat_id: chatId,
          role: data.role,
          content: data.content,
          tool_call_id: data.tool_call_id,
          tool_calls: data.tool_calls,
          created_at: data.created_at
        });
      });

      return messages;
    } catch (error) {
      console.error('❌ Error leyendo de Realtime Database:', error);
      return [];
    }
  },

  clearMemory: async (chatId: number) => {
    try {
      const chatRef = db.ref(`chats/${chatId}`);
      await chatRef.remove();
      console.log(`🧠 Memoria borrada en Realtime Database para chat ${chatId}`);
      return { changes: 1 };
    } catch (error) {
      console.error('❌ Error borrando memoria en Realtime Database:', error);
      throw error;
    }
  }
};
