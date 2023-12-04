module.exports = {
    plugins: [
        "@babel/plugin-class-properties",
        "const-enum",
        "@babel/plugin-transform-runtime",
    ],
    presets: [
        "@babel/preset-env",
        "@babel/preset-typescript",
        "@babel/preset-react",
    ],
    env: {
        es: {
            presets: [["@babel/preset-env", { modules: false }]],
        },
    },
};
