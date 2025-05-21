<script lang="ts">
  import { atproto } from "$lib/atproto.svelte";
  import { user } from "$lib/user.svelte";
  import { onMount } from "svelte";
  import toast from "svelte-french-toast";

  let error = $state("");
  let processing = $state(true);
  let debug = $state({
    url: "",
    params: {},
    time: new Date().toISOString()
  });

  onMount(async () => {
    const currentUrl = globalThis.location.href;
    debug.url = currentUrl;
    
    try {
      await atproto.init();
      const searchParams = new URL(currentUrl).searchParams;
      
      // Convert searchParams to object for debugging
      const paramsObj: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        paramsObj[key] = value;
      });
      debug.params = paramsObj;
      
      console.log("OAuth callback processing:", {
        url: currentUrl,
        params: paramsObj
      });

      // Try to handle the callback
      const result = await atproto.oauth.callback(searchParams);
      console.log("OAuth callback succeeded");
      
      // Set the user session
      user.session = result.session;
      
      // Redirect back to the saved path or to the bridge configuration
      const redirectPath = localStorage.getItem("redirectAfterAuth") || "/bridge";
      window.location.href = redirectPath;
    } catch (e) {
      console.error("Error during OAuth callback:", e);
      error = e instanceof Error ? e.message : String(e);
      processing = false;
      toast.error("Login failed. Please try again.");
    }
  });
</script>

<div class="min-h-screen flex flex-col items-center justify-center p-4">
  <div class="max-w-md w-full bg-base-200 p-8 rounded-lg shadow-lg">
    {#if processing}
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Logging in...</h1>
        <div class="flex justify-center">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <p class="mt-4 text-base-content/70">Completing your login with Bluesky.</p>
      </div>
    {:else if error}
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Login Error</h1>
        <div class="bg-error/20 p-4 rounded-lg mb-4">
          <p class="text-error">Error logging in: {error}</p>
        </div>
        
        <div class="bg-base-300 p-4 rounded-lg mb-4 text-xs overflow-auto text-left">
          <h3 class="font-bold mb-2">Debug Information</h3>
          <pre class="whitespace-pre-wrap break-all">{JSON.stringify(debug, null, 2)}</pre>
        </div>
        
        <p class="mb-4">Please try again with the following steps:</p>
        <ul class="list-disc text-left px-4 mb-4">
          <li>Clear browser cookies/storage</li>
          <li>Try using either localhost or 127.0.0.1 consistently</li>
          <li>Complete the login process within one browser session</li>
        </ul>
        
        <a href="/" class="btn btn-primary">Return to Login</a>
      </div>
    {/if}
  </div>
</div>