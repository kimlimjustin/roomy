import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Client, GatewayIntentBits } from 'discord.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { token, guildId } = await request.json();
    
    if (!token || !guildId) {
      return json({ error: 'Missing token or guildId' }, { status: 400 });
    }
    
    // Create a new Discord client
    const client = new Client({ 
      intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages
      ] 
    });
    
    try {
      // Login with the token
      await client.login(token);
      
      // Wait for the client to be ready
      await new Promise<void>((resolve) => {
        if (client.isReady()) resolve();
        else client.once('ready', () => resolve());
      });
      
      // Get the guild
      const guild = await client.guilds.fetch(guildId);
      
      if (!guild) {
        await client.destroy();
        return json({ error: 'Guild not found' }, { status: 404 });
      }
      
      // Get all text channels
      const channels = await guild.channels.fetch();
      const textChannels = channels
        .filter((channel) => channel?.isTextBased() && !channel.isDMBased())
        .map((channel) => ({
          id: channel?.id,
          name: channel?.name
        }));
      
      // Destroy the client to clean up
      await client.destroy();
      
      return json({ channels: textChannels });
    } catch (error) {
      // Make sure to destroy the client on error
      await client.destroy();
      throw error;
    }
  } catch (error) {
    console.error('Error fetching Discord channels:', error);
    return json({ error: 'Failed to fetch Discord channels' }, { status: 500 });
  }
};