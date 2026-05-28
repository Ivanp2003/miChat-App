import { Account, Client, Databases, Storage } from "appwrite";

// Polyfill para React Native/Expo con Hermes - WebSocket handshake
if (typeof (global as any).self === "undefined") {
  (global as any).self = global;
}

export const APPWRITE_CONFIG = {
  ENDPOINT: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
  PROJECT_ID: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
  DATABASE_ID: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
  COLLECTIONS: {
    PROFILES: process.env.EXPO_PUBLIC_APPWRITE_PROFILES_ID!,
    ROOMS: process.env.EXPO_PUBLIC_APPWRITE_ROOMS_ID!,
    MESSAGES: process.env.EXPO_PUBLIC_APPWRITE_MESSAGES_ID!,
    ROOM_PARTICIPANTS: process.env.EXPO_PUBLIC_APPWRITE_ROOM_PARTICIPANTS_ID!,
    UNREAD_MESSAGES: process.env.EXPO_PUBLIC_APPWRITE_UNREAD_MESSAGES_ID!,
    PUSH_TOKENS: process.env.EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_ID!,
  },
  STORAGE_BUCKET_ID: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID!,
};

// Cliente configurado para React Native/Expo
const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
  .setProject(APPWRITE_CONFIG.PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const appwriteClient = client;
