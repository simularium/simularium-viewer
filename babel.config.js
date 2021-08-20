module.exports = {
    plugins: ["@babel/plugin-proposal-class-properties", "const-enum"],
    presets: [
        "@babel/preset-env",
        "@babel/preset-typescript",
        "@babel/preset-react",
    ],
    env: {
        es: {
            presets: [["@babel/preset-env", { modules: false }]],
        },
        test: {
            plugins: ["@babel/plugin-transform-runtime"]
        }
    },
};
