module.exports = {
    extends: ["plugin:@typescript-eslint/recommended", "plugin:react/recommended"],
    env: {
        mocha: true,
        es6: true,
        browser: true,
    },
    ignorePatterns: ["examples/webpack.dev.js", ".eslintrc.js", "babel.config.js"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.json", "./src/visGeometry/workers/tsconfig.json"],
    },
    plugins: ["@typescript-eslint", "react"],
    rules: {
        "@typescript-eslint/ban-types": ["warn"],
        "@typescript-eslint/naming-convention": [
            "warn",
            {
                selector: "default",
                format: ["camelCase", "PascalCase"],
            },
            {
                selector: "variable",
                format: ["camelCase", "UPPER_CASE", "PascalCase"],
            },
            {
                selector: "property",
                format: ["camelCase", "UPPER_CASE"],
                leadingUnderscore: "allow",
            },
            {
                selector: "typeLike",
                format: ["PascalCase"],
            },
            {
                selector: "interface",
                format: ["PascalCase"],
            },
            {
                selector: "enumMember",
                format: ["UPPER_CASE"],
            },
            {
                selector: "parameter",
                format: ["camelCase"],
                leadingUnderscore: "allow",
            },
        ],
        "@typescript-eslint/indent": ["off"],
        "@typescript-eslint/no-empty-function": ["warn"],
        "@typescript-eslint/no-inferrable-types": ["warn"],
        "@typescript-eslint/no-this-alias": ["warn"],
        "prefer-const": ["warn"],
        "prefer-spread": ["warn"],
        "no-var": ["warn"],
        // note you must disable the base rule as it can report incorrect errors
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
    settings: {
        react: {
            version: "detect",
        },
    },
};
