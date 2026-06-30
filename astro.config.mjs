import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

export default defineConfig({
  output: "static",
  security: {
    checkOrigin: false
  },
  adapter: vercel()
});
