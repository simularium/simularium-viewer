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
        "@typescript-eslint/naming-convention": [
            "warn",
            {
                selector: "default",
                format: ["camelCase", "PascalCase"],
            },
            {
                selector: "variable",
                format: ["camelCase", "UPPER_CASE"],
            },
            {
                selector: "typeLike",
                format: ["PascalCase"],
            },
        ],
        "@typescript-eslint/indent": ["off"],
        "@typescript-eslint/no-empty-function": ["warn"],
        "prefer-const": ["warn"],
        "prefer-spread": ["warn"],
        "no-var": ["warn"],
    },
};