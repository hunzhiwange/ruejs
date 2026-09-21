import { defineConfig } from 'vite-plus'
import text from '@rue-js/text'
import VitePluginRue from '@rue-js/vite-plugin-rue'

export default defineConfig({
  plugins: [
    text({ rue: false }),
    // The full text test suite runs several compiler-heavy workers in parallel.
    // Keep the production watchdog unchanged while giving this cold SSR fixture
    // enough time to compile on constrained CI runners.
    VitePluginRue({ target: 'hydrate', transformTimeoutMs: 60_000 }),
  ],
})
