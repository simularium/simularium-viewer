const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    entry: "./examples/index.tsx",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "public"),
    },
    mode: "development",
    devtool: "source-map",
    plugins: [
        new HtmlWebpackPlugin({
            template: "./examples/index.html",
        }),
        new MiniCssExtractPlugin({
            filename: "style.[contenthash].css",
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "examples/assets",
                    to: path.resolve(__dirname, "public/assets"),
                },
            ],
        }),
    ],
    devServer: {
        publicPath: "/public/",
        openPage: "public/",
        disableHostCheck: true,
    },
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
            {
                test: /\.css/,
                include: [path.resolve(__dirname, "style")],
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        loader: "css-loader",
                    },
                ],
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: ["file-loader"],
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
};
