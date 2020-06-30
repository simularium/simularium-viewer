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
        "@typescript-eslint/naming-convention": ["warn", {
            "selector": "default",
            "format": ["camelCase", "PascalCase"]
        }, {
            "selector": "variable",
            "format": ["camelCase"]
        }, {
            "selector": "typeLike",
            "format": ["PascalCase"]
        }],
        "@typescript-eslint/indent": ["off"],
        "prefer-const": ["warn"],
        "no-var": ["warn"]
    },
};