<script>
  let { children } = $props();
</script>

<div>
  {@render children()}
</div>

<style>
  @import "../app.css";

  :global(body) {
    @apply bg-violet-950 text-white;
  }
</style>
