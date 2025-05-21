import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { activeBridges,  findOrCreateWebhook } from '$lib/server/bridge-store';
import { TextChannel } from 'discord.js';

export const POST: RequestHandler = async ({ request }) => {
  const { content, mapping, author, avatarUrl, sessionId } = await request.json();
  
  if (!content || !mapping || !sessionId) {
    return json({ 
      success: false, 
      message: "Missing required data" 
    }, { status: 400 });
  }
  
  const bridge = activeBridges.get(sessionId);
  
  if (!bridge || !bridge.discordClient) {
    return json({
      success: false,
      message: "No active Discord client"
    }, { status: 404 });
  }
  
  try {
    // Get the Discord channel
    const channel = await bridge.discordClient.channels.fetch(mapping.discordChannelId) as TextChannel;
    if (!channel) {
      throw new Error(`Discord channel ${mapping.discordChannelName} not found`);
    }
    
    // Use webhook approach if author is provided
    if (author) {
      // Find existing webhook or create new one
      let webhook = await findOrCreateWebhook(channel, bridge.discordClient);
      
      // Send the message with custom username and optional avatar
      await webhook.send({
        content: content,
        username: author,
        avatarURL: avatarUrl || undefined
      });
    } else {
      // Fallback to regular message
      await channel.send(content);
    }
    
    return json({
      success: true,
      message: `Message sent to Discord channel ${mapping.discordChannelName}`
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending message to Discord:', error);
    return json({
      success: false,
      message: `Error: ${errorMessage}`
    }, { status: 500 });
  }
};