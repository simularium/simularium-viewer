module.exports = {
    plugins: [
        "@babel/plugin-transform-class-properties",
        "const-enum",
        "@babel/plugin-transform-runtime",
    ],
    presets: [
        ["@babel/preset-env", { modules: false }],
        "@babel/preset-typescript",
        "@babel/preset-react",
    ],
    env: {
        es: {
            presets: [["@babel/preset-env", { modules: false }]],
        },
        test: {
            presets: [["@babel/preset-env", { modules: "auto" }]],
        },
    },
};
