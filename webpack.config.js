const path = require("path");

module.exports = {
    entry: "./src/index.ts",
    output: {
        filename: "index.js",
        library: "simularium-viewer",
        libraryTarget: "umd",
        path: path.resolve(__dirname, "dist"),
    },
    mode: "development",
    module: {
        rules: [
            {
                test: /\.(j|t)sx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "babel-loader",
                    },
                ],
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
};
