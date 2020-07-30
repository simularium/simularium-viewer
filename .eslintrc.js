module.exports = {
    extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
    ],
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
        "@typescript-eslint/ban-types": ["warn"],
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
                selector: "property",
                format: ["camelCase", "UPPER_CASE"],
            },
            {
                selector: "typeLike",
                format: ["PascalCase"],
            },
            {
                selector: "enumMember",
                format: ["UPPER_CASE"],
            },
        ],
        "@typescript-eslint/indent": ["off"],
        "@typescript-eslint/no-empty-function": ["warn"],
        "@typescript-eslint/no-inferrable-types": ["warn"],
        "@typescript-eslint/no-this-alias": ["warn"],
        "prefer-const": ["warn"],
        "prefer-spread": ["warn"],
        "no-var": ["warn"],
    },
};
