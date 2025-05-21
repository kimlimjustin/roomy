import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import arrayBuffer from 'vite-plugin-arraybuffer';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapterNode()
  },

  // ==== moved out of kit.vite into top-level vite ====
  vite: {
    plugins: [arrayBuffer(), wasm(), topLevelAwait()],
    optimizeDeps: {
      include: ['@muni-town/leaf-svelte', '@muni-town/leaf-sync-ws',"@muni-town/leaf-storage-indexeddb"]
    },
    ssr: {
      noExternal: ['@muni-town/leaf-svelte', '@muni-town/leaf-sync-ws',"@muni-town/leaf-storage-indexeddb"]
    }
  }
};

export default config;