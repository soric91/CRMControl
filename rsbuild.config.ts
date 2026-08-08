import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';

// Declared explicitly rather than left to the dev/build defaults, so the test
// runner — which reuses this config — resolves PUBLIC_* the same way the
// browser bundle does.
const { publicVars } = loadEnv();

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginTailwindcss(),
  ],
  source: {
    define: publicVars,
  },
});
