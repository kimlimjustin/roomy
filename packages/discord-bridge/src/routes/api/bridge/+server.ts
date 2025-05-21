import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { activeBridges, channelMappings, createDiscordClient, processedMessages, type ChannelMapping } from '$lib/server/bridge-store';
import { Events } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { addDiscordMessage } from '../messages/+server';

// Start bridge
export const POST: RequestHandler = async ({ request }) => {
  const { discordToken, mappings } = await request.json();
  
  if (!discordToken || !mappings || mappings.length === 0) {
    return json({ success: false, message: "Missing required data" }, { status: 400 });
  }
  
  // Generate a unique session ID
  const sessionId = uuidv4();
  
  try {
    // Initialize Discord client
    const discordClient = createDiscordClient(discordToken);
    await discordClient.login(discordToken);
    
    // Save mappings
    channelMappings.set(sessionId, mappings);
    
    // Setup Discord message handler
    discordClient.on(Events.MessageCreate, async (message) => {
      // Ignore bot messages to avoid loops
      if (message.author.bot) return;
      
      // Find the mapping for this channel
    const mapping: ChannelMapping | undefined = mappings.find((m: ChannelMapping) => m.discordChannelId === message.channelId);
      if (!mapping) return;
      
      const messageId = `discord-${message.id}`;
      if (processedMessages.has(messageId)) return;
      processedMessages.add(messageId);
      
      try {
        // Get Discord avatar URL
        let avatarUrl = message.author.displayAvatarURL({ size: 128 });
        
        // Create message data object
        const messageData = {
          content: message.content,
          author: {
            username: message.author.username,
            id: message.author.id,
            avatarUrl: avatarUrl
          },
          mapping: mapping,
          discordMessageId: message.id,
          timestamp: message.createdTimestamp
        };
        
        // Add to message store for polling
        addDiscordMessage(sessionId, messageData);
        
        // Clean up message ID after a delay
        setTimeout(() => {
          processedMessages.delete(messageId);
        }, 60000);
        
      } catch (error: unknown) {
        // const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error processing Discord message:', error);
      }
    });
    
    // Store in active bridges
    activeBridges.set(sessionId, { discordClient });
    
    console.log(`Bridge started for session ${sessionId}`);
    
    return json({ 
      success: true, 
      message: "Bridge started successfully",
      sessionId: sessionId
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error starting bridge:", error);
    return json({ success: false, message: errorMessage }, { status: 500 });
  }
};

// Stop bridge
export const DELETE: RequestHandler = async ({ request }) => {
  const { sessionId } = await request.json();
  
  if (!sessionId) {
    return json({ success: false, message: "Session ID required" }, { status: 400 });
  }
  
  try {
    const bridge = activeBridges.get(sessionId);
    if (!bridge) {
      return json({ success: false, message: "No active bridge found" }, { status: 404 });
    }
    
    // Cleanup Discord client
    if (bridge.discordClient) {
      await bridge.discordClient.destroy();
    }
    
    // Remove from active bridges
    activeBridges.delete(sessionId);
    channelMappings.delete(sessionId);
    
    console.log(`Bridge stopped for session ${sessionId}`);
    return json({ success: true, message: "Bridge stopped successfully" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error stopping bridge:", error);
    return json({ success: false, message: errorMessage }, { status: 500 });
  }
};