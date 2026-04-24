import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { "@": path.resolve(__dirname, "src") },
        extensions: [".mjs", ".mts", ".ts", ".tsx", ".js", ".jsx", ".json"],
    },
    server: {
        host: "0.0.0.0",
        port: 5173,
        proxy: {
            "/api": {
                target: "http://127.0.0.1:1241",
                changeOrigin: true,
            },
            "/share": {
                target: "http://127.0.0.1:1241",
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes("node_modules")) return;

                    if (
                        id.includes("/react/") ||
                        id.includes("/react-dom/") ||
                        id.includes("/scheduler/") ||
                        id.includes("/wouter/") ||
                        id.includes("/zustand/")
                    ) {
                        return "framework";
                    }

                    if (id.includes("/i18next") || id.includes("/react-i18next/")) {
                        return "i18n";
                    }

                    if (id.includes("/framer-motion/")) {
                        return "motion";
                    }

                    if (id.includes("/@dnd-kit/")) {
                        return "dnd-kit";
                    }

                    if (id.includes("/@tanstack/react-virtual/")) {
                        return "tanstack";
                    }

                    if (id.includes("/lucide-react/") || id.includes("/@lobehub/icons/")) {
                        return "icons";
                    }

                    if (
                        id.includes("/streamdown/") ||
                        id.includes("/mermaid/") ||
                        id.includes("/highlight.js/")
                    ) {
                        return "content";
                    }
                },
            },
        },
    },
});
