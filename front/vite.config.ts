/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],

  server: {
    port: 5173,
    historyApiFallback: true
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
  },

  // ── Vitest ──────────────────────────────────────────────────────────────
  // On réutilise la MÊME config Vite pour les tests (mêmes alias "@/...",
  // même plugin React) plutôt qu'un fichier séparé : évite que les deux
  // configs divergent avec le temps (ex: quelqu'un ajoute un alias dans
  // vite.config.ts et oublie de le répercuter dans vitest.config.ts).
  // Doc : https://vitest.dev/config/
  test: {
    environment: "jsdom",       // simule le DOM (document, window...) en Node
    globals: true,               // describe/it/expect disponibles sans import
    setupFiles: "./src/test/setup.ts",
    css: true,                   // nécessaire pour les composants qui importent du CSS (global.css)
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // On exclut volontairement de la couverture tout ce qui n'est pas
      // "notre" logique testable : fichiers de config, points d'entrée,
      // données mock, types purs (rien à exécuter dedans).
      exclude: [
        "node_modules/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/types/**",
        "src/test/**",
      ],
    },
  },
});