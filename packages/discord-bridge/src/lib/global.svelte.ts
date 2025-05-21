import {
  Channel,
  EntityId,
  type EntityIdStr,
  Roomy,
  Space,
  Thread,
  StorageManager,
} from "@roomy-chat/sdk";
import { SveltePeer } from "@muni-town/leaf-svelte";
import { indexedDBStorageAdapter } from "@muni-town/leaf-storage-indexeddb";
import { webSocketSyncer } from "@muni-town/leaf-sync-ws";

import { user } from "./user.svelte";
import type { Agent } from "@atproto/api";
import toast from "svelte-french-toast";

// Browser environment check
const isBrowser = typeof window !== 'undefined';

// Expose roomy SDK globally for debugging only in browser environment
import * as roomy from "@roomy-chat/sdk";
if (isBrowser) {
  (window as any).r = roomy;
}

// Reload app when this module changes to prevent accumulated connections
if (isBrowser && import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}

export let bridgeState = $state({
  // Roomy instance that will be initialized when user logs in
  roomy: undefined as Roomy | undefined,
  // Currently selected space in the bridge UI
  currentSpace: undefined as Space | undefined,
  // Currently selected channel in the bridge UI
  currentChannel: undefined as Channel | Thread | undefined,
  // Flag to track if Roomy initialization is in progress
  isInitializingRoomy: false,
  // Flag to track if spaces are currently being loaded
  isLoadingSpaces: false,
  // Array to store the user's spaces
  spaces: [] as Space[],
  // Error information if Roomy initialization fails
  roomyError: null as Error | null,
  // Last time Roomy was successfully initialized
  lastInitialized: null as Date | null,
});

// Create a default entity ID
const entityId = new EntityId();

// Set up the root effect that manages Roomy initialization
$effect.root(() => {
  // Automatically initialize Roomy when user authentication changes
  $effect(() => {
    if (user.agent && user.catalogId.value && !bridgeState.roomy && !bridgeState.isInitializingRoomy) {
      initRoomy(user.agent);
    } else if (!user.agent || !user.session) {
      // Clear Roomy instance when user logs out
      cleanupRoomy();
    }
  });
});

/**
 * Initialize the Roomy instance using the current user session
 */
async function initRoomy(agent: Agent): Promise<void> {
  // Only attempt to initialize Roomy in browser environments
  if (!isBrowser) {
    console.warn("Attempted to initialize Roomy in non-browser environment");
    return;
  }
  
  const catalogId = user.catalogId.value;
  if (!catalogId) {
    console.error("Cannot initialize Roomy without catalog ID");
    bridgeState.roomyError = new Error("Cannot initialize Roomy without catalog ID");
    return;
  }
  
  // Set flag to indicate initialization is in progress
  bridgeState.isInitializingRoomy = true;
  
  try {
    console.log("Initializing Roomy with catalog ID:", catalogId);
    
    // Fetch a syncserver authentication token
    const resp = await agent.call(
      "chat.roomy.v0.sync.token", 
      undefined, 
      undefined,
      {
        headers: {
          "atproto-proxy": "did:web:syncserver.roomy.chat#roomy_syncserver",
        },
      }
    );
    
    if (!resp.success) {
      throw new Error(`Error obtaining router auth token ${JSON.stringify(resp)}`);
    }
    
    const token = resp.data.token as string;
    
    // Open router client - WebSocket only available in browser
    const websocket = new WebSocket(
      `wss://syncserver.roomy.chat/sync/as/${agent.assertDid}`,
      ["authorization", token]
    );
    
    // Initialize the peer with storage and syncer
    const peer = new SveltePeer(
      new StorageManager(
        indexedDBStorageAdapter("discord-bridge-roomy")
      ),
      await webSocketSyncer(websocket)
    );
    
    // Initialize Roomy with the catalog ID
    const roomyInstance = await Roomy.init(peer, catalogId as EntityIdStr);
    
    // Update state with the initialized Roomy instance
    bridgeState.roomy = roomyInstance;
    bridgeState.lastInitialized = new Date();
    bridgeState.roomyError = null;
    console.log("Roomy instance initialized successfully");
    
    // Load spaces after successful initialization
    loadSpaces();
  } catch (error) {
    console.error("Error initializing Roomy:", error);
    bridgeState.roomyError = error instanceof Error ? error : new Error(String(error));
    toast.error("Failed to connect to Roomy services");
  } finally {
    bridgeState.isInitializingRoomy = false;
  }
}

/**
 * Load all spaces for the current user
 */
async function loadSpaces(): Promise<void> {
  if (!bridgeState.roomy) {
    console.error("Cannot load spaces without a Roomy instance");
    return;
  }
  
  bridgeState.isLoadingSpaces = true;
  
  try {
    const spaces = await bridgeState.roomy.spaces.items();
    bridgeState.spaces = spaces;
    console.log("Loaded spaces:", spaces);
  } catch (error) {
    console.error("Error loading spaces:", error);
    toast.error("Failed to load spaces");
  } finally {
    bridgeState.isLoadingSpaces = false;
  }
}

/**
 * Clean up the Roomy instance when user logs out
 */
function cleanupRoomy(): void {
  bridgeState.roomy = undefined;
  bridgeState.currentSpace = undefined;
  bridgeState.currentChannel = undefined;
  bridgeState.spaces = [];
}

/**
 * Wait for Roomy to be initialized
 * @param timeout Maximum time to wait in milliseconds
 * @returns The Roomy instance or undefined if initialization fails
 */
export async function waitForRoomy(timeout = 10000): Promise<Roomy | undefined> {
  // If Roomy is already initialized, return it immediately
  if (bridgeState.roomy) {
    return bridgeState.roomy;
  }
  
  // If initialization is in progress, wait for it to complete
  if (bridgeState.isInitializingRoomy) {
    const startTime = Date.now();
    while (bridgeState.isInitializingRoomy && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return bridgeState.roomy;
  }
  
  // If not initialized and not in progress, try to initialize
  if (user.agent && user.catalogId.value) {
    await initRoomy(user.agent);
    return bridgeState.roomy;
  }
  
  return undefined;
}

/**
 * Get spaces from the Roomy instance, initializing it if necessary
 */
export async function getSpaces(): Promise<Space[]> {
  await waitForRoomy();
  
  if (!bridgeState.roomy) {
    console.error("Failed to initialize Roomy");
    return [];
  }
  
  if (bridgeState.spaces.length === 0 && !bridgeState.isLoadingSpaces) {
    await loadSpaces();
  }
  
  return bridgeState.spaces;
}

/**
 * Set the current active space
 */
export async function setCurrentSpace(spaceId: EntityIdStr): Promise<Space | undefined> {
  if (!bridgeState.roomy) {
    await waitForRoomy();
    if (!bridgeState.roomy) return undefined;
  }
  
  try {
    const space = await bridgeState.roomy.open(Space, spaceId);
    bridgeState.currentSpace = space;
    return space;
  } catch (error) {
    console.error("Error opening space:", error);
    toast.error("Failed to open space");
    return undefined;
  }
}

/**
 * Get channels for a specific space
 */
export async function getChannelsForSpace(spaceId: EntityIdStr): Promise<Channel[]> {
  if (!bridgeState.roomy) {
    await waitForRoomy();
    if (!bridgeState.roomy) return [];
  }
  
  try {
    const space = await bridgeState.roomy.open(Space, spaceId);
    return await space.channels.items();
  } catch (error) {
    console.error("Error fetching channels for space:", error);
    toast.error("Failed to load channels");
    return [];
  }
}

// Export the bridge state singleton
export const bridge = {
  get state() {
    return bridgeState;
  },
  
  async initRoomy() {
    if (user.agent && user.catalogId.value) {
      return initRoomy(user.agent);
    }
  },
  
  getSpaces,
  setCurrentSpace,
  getChannelsForSpace,
  waitForRoomy,
};