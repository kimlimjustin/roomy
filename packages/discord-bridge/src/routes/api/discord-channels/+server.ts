import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { ProxyAgent } from 'undici';
import { proxyData } from '$lib/server/environment';

// Add support for running behind an http proxy
const envHttpProxyAgent = new ProxyAgent({
    requestTls: { rejectUnauthorized: false },
    uri: `${proxyData.protocol}://${proxyData.hostname}:${proxyData.port}`,
  });
// Setup Discord client creation function
function createDiscordClient(): Client {
  const client = new Client({
    rest: {
      agent: envHttpProxyAgent as any,
    },
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ]
  });
  
  return client;
}

export const POST: RequestHandler = async ({ request }) => {
  const { token, guildId } = await request.json();
  
  if (!token || !guildId) {
    return json({ error: "Missing token or guild ID" }, { status: 400 });
  }
  
  try {
    const client = createDiscordClient();
    
    // Use a promise to wait for the client to be ready
    await new Promise<void>((resolve, reject) => {
      client.once(Events.ClientReady, () => resolve());
      client.once(Events.Error, reject);
      client.login(token).catch(reject);
    });
    
    // Fetch guild and channels
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      await client.destroy();
      return json({ error: "Guild not found" }, { status: 404 });
    }
    
    const channels = await guild.channels.fetch();
    const textChannels = channels.filter(channel => 
      channel?.type === 0 || channel?.type === 5 // TextChannel or AnnouncementChannel
    ).map(channel => ({
      id: channel.id,
      name: channel.name
    }));
    
    await client.destroy();
    
    return json({ channels: textChannels });
  } catch (error) {
    console.error("Error fetching Discord channels:", error);
    return json({ error: "Failed to fetch Discord channels" }, { status: 500 });
  }
};