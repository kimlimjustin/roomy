import { Client, TextChannel, Events, GatewayIntentBits, type Webhook } from 'discord.js';
import { ProxyAgent } from 'undici';
import { proxyData } from './environment';

// Create a proxy agent only if we have valid hostname data
const envHttpProxyAgent = proxyData.hostname 
  ? new ProxyAgent({
      requestTls: { rejectUnauthorized: false },
      uri: `${proxyData.protocol}://${proxyData.hostname}:${proxyData.port}`,
    })
  : null;

// Define channel mapping type
export interface ChannelMapping {
  discordChannelId: string;
  discordChannelName: string;
  roomyChannelId: string;
  roomyChannelName: string;
}

// Define bridge data type - simpler now, only Discord client
export interface BridgeData {
  discordClient: Client;
}

// Track active bridges by user session
export const activeBridges = new Map<string, BridgeData>();

// Channel mappings per user
export const channelMappings = new Map<string, ChannelMapping[]>();

// Track processed messages to avoid loops
export const processedMessages = new Set<string>();

// Setup Discord client
export function createDiscordClient(token: string): Client {
  const client = new Client({
    rest: envHttpProxyAgent ? {
      agent: envHttpProxyAgent as any,
    } : undefined,
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ]
  });

  client.login(token).catch(error => {
    console.error('Error logging in Discord client:', error);
    throw new Error('Failed to log in Discord client');
  });
  
  return client;
}

// Helper function to find or create webhook
export async function findOrCreateWebhook(channel: TextChannel): Promise<Webhook> {
  try {
    // Check for existing webhooks
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find(wh => wh.name === 'RoomyBridge');
    
    // Create webhook if it doesn't exist
    if (!webhook) {
      webhook = await channel.createWebhook({
        name: 'RoomyBridge',
        avatar: 'https://i.imgur.com/AfFp7pu.png', // Default avatar, change to your app's logo
        reason: 'Created for Roomy-Discord bridge'
      });
    }
    
    return webhook;
  } catch (error) {
    console.error('Error creating webhook:', error);
    throw new Error('Failed to create webhook for message customization');
  }
}

// Clean up function to remove users and clean resources
export async function cleanupSession(sessionId: string) {
  const bridge = activeBridges.get(sessionId);
  
  if (bridge && bridge.discordClient) {
    await bridge.discordClient.destroy();
  }
  
  activeBridges.delete(sessionId);
  channelMappings.delete(sessionId);
}