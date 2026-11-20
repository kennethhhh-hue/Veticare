import { defineConfig, PluginOption } from "vite";
import { enterDevPlugin, enterProdPlugin } from 'vite-plugin-enter-dev';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [
    ...enterProdPlugin(),
  ];
  if (mode === 'development') {
    plugins.push(...enterDevPlugin());
  }
  return {
    server: {
      host: "::",
      port: 8080,
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "::1",
        ...(process.env.VITE_ALLOWED_HOST ? [process.env.VITE_ALLOWED_HOST] : []),
      ],
      hmr: process.env.VITE_ALLOWED_HOST
        ? {
            protocol: "wss",
            host: process.env.VITE_ALLOWED_HOST,
            clientPort: 443,
          }
        : undefined,
    },
    preview: {
      allowedHosts: ["sour-areas-deny.loca.lt"],
    },
    plugins: plugins.filter(Boolean) as PluginOption[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: '/',
    build: {
      outDir: 'dist',
    }
  };
});