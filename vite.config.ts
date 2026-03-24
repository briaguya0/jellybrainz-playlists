import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { mockJellyfinPlugin } from "./vite-plugin-mock-jellyfin";

const isGhPages = process.env.GITHUB_PAGES === "true";

const config = defineConfig({
  base: isGhPages ? "/jellybrainz-playlists/" : "/",
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    mockJellyfinPlugin(),
  ],
});

export default config;
