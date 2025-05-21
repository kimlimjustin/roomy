<script lang="ts">
  import { onMount } from "svelte";
  import { user } from "$lib/user.svelte";
  import { bridge } from "$lib/global.svelte";
  import { navigate } from "$lib/navigation";
  import toast from "svelte-french-toast";
  
  // State variables
  let handle = $state("");
  let isLoggingIn = $state(false);
  let isInitialized = $state(false);
  
  // Use the bridge state instead of local state
  $effect(() => {
    // Reset loading state when user logs out
    if (!user.session) {
      bridge.state.spaces = [];
    }
  });
  
  onMount(async () => {
    try {
      // Initialize user authentication
      await user.init();
      isInitialized = true;
      
      // If user is authenticated, load spaces
      if (user.isAuthenticated) {
        // The bridge.getSpaces() will handle waiting for catalog ID
        // and initializing Roomy if needed
        await bridge.getSpaces();
      }
    } catch (error) {
      console.error("Failed to initialize authentication:", error);
      toast.error("Failed to initialize authentication");
    }
  });

  async function login() {
    if (!handle.trim()) {
      toast.error("Please enter your Bluesky handle");
      return;
    }

    isLoggingIn = true;
    try {
      // Save current origin to ensure consistent login flow
      localStorage.setItem("loginOrigin", window.location.origin);
      localStorage.setItem("redirectAfterAuth", window.location.pathname);
      
      await user.loginWithHandle(handle);
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Login failed. Please try again.");
      isLoggingIn = false;
    }
  }
  
  function goToBridge() {
    navigate("/bridge");
  }
</script>

<div class="min-h-screen flex flex-col items-center justify-center p-4">
  <div class="max-w-md w-full bg-base-200 p-8 rounded-lg shadow-lg">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold mb-2">Discord-Roomy Bridge</h1>
      <p class="text-base-content/70">Connect your Discord server with Roomy spaces</p>
    </div>

    {#if isInitialized}
      {#if user.session}
        <!-- Content for authenticated users -->
        <div class="space-y-6">
          {#if user.profile?.data}
            <div class="flex items-center justify-center mb-4">
              {#if user.profile.data.avatar}
                <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-primary mr-4">
                  <img 
                    src={user.profile.data.avatar} 
                    alt="Profile" 
                    class="w-full h-full object-cover"
                  />
                </div>
              {/if}
              <div>
                <h2 class="text-xl font-semibold">{user.profile.data.displayName}</h2>
                <p class="text-sm opacity-70">@{user.profile.data.handle}</p>
              </div>
            </div>
          {/if}
          
          <!-- User Servers Section -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-2">Your Roomy Spaces</h3>
            
            {#if bridge.state.isLoadingSpaces || bridge.state.isInitializingRoomy}
              <div class="bg-base-300 rounded-lg p-4 text-center">
                <p>Loading spaces...</p>
              </div>
            {:else if bridge.state.roomyError}
              <div class="bg-base-300 rounded-lg p-4 text-center">
                <p>Error loading spaces: {bridge.state.roomyError.message}</p>
                <button class="btn btn-sm btn-primary mt-2" onclick={() => bridge.initRoomy()}>
                  Try Again
                </button>
              </div>
            {:else if bridge.state.spaces.length === 0}
              <div class="bg-base-300 rounded-lg p-4 text-center">
                <p>No spaces found. Create a space in Roomy first.</p>
              </div>
            {:else}
              <div class="space-y-2 max-h-48 overflow-y-auto">
                {#each bridge.state.spaces as space}
                  <div class="bg-base-300 rounded-lg p-3 flex items-center">
                    <div class="w-8 h-8 rounded bg-primary/20 flex items-center justify-center mr-3">
                      <span class="font-bold">{space.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 class="font-medium">{space.name}</h3>
                      <p class="text-xs opacity-70">{space.members || 0} members</p>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="bg-base-300 p-4 rounded-lg text-sm mb-4">
            <p>You're signed in with Bluesky. You can now configure the Discord-Roomy Bridge.</p>
          </div>

          <div class="flex flex-col gap-3">
            <button 
              class="btn btn-primary w-full" 
              onclick={goToBridge}
            >
              Go to Bridge Configuration
            </button>
            <button 
              class="btn btn-outline btn-error" 
              onclick={() => user.logout()}
            >
              Logout
            </button>
          </div>
        </div>
      {:else}
        <!-- Content for non-authenticated users -->
        <div class="space-y-6">
          <div class="bg-base-300 p-4 rounded-lg text-sm">
            <p class="mb-2">To use the Discord-Roomy Bridge:</p>
            <ol class="list-decimal list-inside space-y-1">
              <li>Log in with your Bluesky account</li>
              <li>Configure your Discord bot settings</li>
              <li>Select a Roomy space to connect</li>
              <li>Map Discord channels to Roomy channels</li>
            </ol>
          </div>

          <div class="form-control">
            <label class="label" for="handle-input">
              <span class="label-text">Bluesky Handle</span>
            </label>
            <input
              id="handle-input"
              type="text"
              placeholder="username.bsky.social"
              class="input input-bordered w-full"
              bind:value={handle}
              onkeydown={(e) => e.key === 'Enter' && login()}
              disabled={isLoggingIn}
            />
          </div>

          <button
            class="btn btn-primary w-full"
            onclick={login}
            disabled={isLoggingIn || !handle.trim()}
          >
            {isLoggingIn ? "Logging in..." : "Login with Bluesky"}
          </button>

          <div class="text-center text-sm text-base-content/70 mt-4">
            <p>You'll be redirected to Bluesky to authorize this application.</p>
          </div>
        </div>
      {/if}
    {:else}
      <div class="flex justify-center py-8">
        <div class="loading loading-spinner loading-lg"></div>
      </div>
    {/if}
  </div>
  
  <div class="mt-8 text-center text-sm text-base-content/70 max-w-md">
    <p>
      Discord-Roomy Bridge allows you to connect your Discord server with Roomy spaces, 
      enabling seamless communication between both platforms.
    </p>
  </div>
</div>
