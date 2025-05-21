import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { activeBridges } from '$lib/server/bridge-store';

// We'll store Discord messages here to be polled
export type DiscordMessage = {
  content: string;
  author: {
    username: string;
    id: string;
    avatarUrl: string;
  };
  mapping: any;
  discordMessageId: string;
  timestamp: number;
};

// Messages store per session
const messageStore = new Map<string, DiscordMessage[]>();
const messageTimestamps = new Map<string, number>();

// Add a Discord message to the store
export function addDiscordMessage(sessionId: string, message: DiscordMessage) {
  if (!messageStore.has(sessionId)) {
    messageStore.set(sessionId, []);
  }
  messageStore.get(sessionId)?.push(message);
  messageTimestamps.set(sessionId, Date.now());
}

// Get endpoint for polling messages
export const GET: RequestHandler = async ({ url }) => {
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    return json({ error: 'Session ID is required' }, { status: 400 });
  }
  
  if (!activeBridges.has(sessionId)) {
    return json({ error: 'No active bridge for this session' }, { status: 404 });
  }
  
  // Get messages for this session
  const messages = messageStore.get(sessionId) || [];
  
  // Clear the messages (as they've been delivered)
  messageStore.set(sessionId, []);
  
  return json({ 
    messages,
    timestamp: messageTimestamps.get(sessionId) || Date.now()
  });
};

// Test connection endpoint
export const POST: RequestHandler = async () => {
  return json({ success: true, message: "Connection is working" });
};