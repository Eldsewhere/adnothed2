import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  base: "/adnothed2/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon-social.png", "icons.svg", "screenshot-mobile.png", "screenshot-wide.png"],
      manifest: {
        name: "Adnothed",
        short_name: "Adnothed",
        description: "Note manager with categories and notifications",
        theme_color: "#1976d2",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/adnothed2/",
        id: "/adnothed2/",
        icons: [
          {
            src: "favicon-social.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "favicon-social.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "screenshot-mobile.png",
            type: "image/png",
            sizes: "390x844",
          },
          {
            src: "screenshot-wide.png",
            type: "image/png",
            sizes: "1280x800",
            form_factor: "wide",
          },
        ],
        share_target: {
          action: "/adnothed2/",
          method: "GET",
          enctype: "application/x-www-form-urlencoded",
          params: {
            text: "text",
            title: "title",
            url: "url",
          },
        },
      },
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
