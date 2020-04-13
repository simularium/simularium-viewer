module.exports = {
    extends: ["plugin:@typescript-eslint/recommended"],
    env: {
        mocha: true,
        es6: true,
        browser: true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "./tsconfig.json",
    },
    plugins: ["@typescript-eslint"],
    rules: {
        "@typescript-eslint/camelcase": ["warn", { properties: "always" }],
        "@typescript-eslint/indent": ["off"],
    },
};
