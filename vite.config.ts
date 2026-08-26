import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/fuerza-app/",
  build: { chunkSizeWarningLimit: 545 },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Fuerza — registro de entrenamientos",
        short_name: "Fuerza",
        description: "Registro personal y offline de entrenamientos de fuerza",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/fuerza-app/",
        scope: "/fuerza-app/",
        lang: "es",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/fuerza-app/index.html",
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://api.github.com",
            handler: "NetworkOnly",
            method: "GET",
          },
          {
            urlPattern: ({ url }) =>
              url.origin === "https://raw.githubusercontent.com" &&
              url.pathname.includes("/hasaneyldrm/exercises-dataset/"),
            handler: "CacheFirst",
            options: {
              cacheName: "fuerza-exercise-media-v1",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
