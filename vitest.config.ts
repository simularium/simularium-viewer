/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test/testSetup.ts"],
        coverage: {
            reporter: ["text", "json-summary", "json"],
        },
        css: false,
    },
});
