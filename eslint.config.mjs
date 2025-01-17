import typescriptEslint from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["examples/webpack.dev.js", "**/.eslintrc.js", "**/babel.config.js"],
}, ...compat.extends("plugin:@typescript-eslint/recommended", "plugin:react/recommended"), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        react,
    },

    languageOptions: {
        globals: {
            ...globals.mocha,
            ...globals.browser,
        },

        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: ["./tsconfig.json", "./src/visGeometry/workers/tsconfig.json"],
        },
    },

    settings: {
        react: {
            version: "detect",
        },
    },

    rules: {
        "@typescript-eslint/no-empty-object-type": ["warn"],
        "@typescript-eslint/no-unsafe-function-type": ["warn"],
        "@typescript-eslint/no-wrapper-object-types": ["warn"],

        "@typescript-eslint/naming-convention": ["warn", {
            selector: "default",
            format: ["camelCase", "PascalCase"],
        }, {
            selector: "variable",
            format: ["camelCase", "UPPER_CASE", "PascalCase"],
        }, {
            selector: "property",
            format: ["camelCase", "UPPER_CASE", "snake_case"],
            leadingUnderscore: "allow",
            pattern: "^[0-9]+$|^[a-zA-Z_][a-zA-Z0-9_]*$",
        }, {
            selector: "typeLike",
            format: ["PascalCase"],
        }, {
            selector: "interface",
            format: ["PascalCase"],
        }, {
            selector: "enumMember",
            format: ["UPPER_CASE"],
        }, {
            selector: "parameter",
            format: ["camelCase"],
            leadingUnderscore: "allow",
        }],

        "@typescript-eslint/indent": ["off"],
        "@typescript-eslint/no-empty-function": ["warn"],
        "@typescript-eslint/no-inferrable-types": ["warn"],
        "@typescript-eslint/no-this-alias": ["warn"],
        "prefer-const": ["warn"],
        "prefer-spread": ["warn"],
        "no-var": ["warn"],
        "no-unused-vars": "off",

        "@typescript-eslint/no-unused-vars": ["warn", {
            argsIgnorePattern: "^_",
        }],
    },
}];