const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");

module.exports = {
    entry: "./src/index.tsx",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "public"),
    },
    mode: "development",
    devtool: "source-map",
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.html",
        }),
        new MiniCssExtractPlugin({
            filename: "style.[contenthash].css",
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "./src/assets",
                    to: path.resolve(__dirname, "public/assets"),
                },
            ],
        }),
        new webpack.DefinePlugin({
            SIMULARIUM_USE_LOCAL_BACKEND: Boolean(
                process.env.npm_config_localserver
            ),
        }),
    ],
    devServer: {
        devMiddleware: {
            publicPath: "/public/",
        },
        open: ["public/"],
        allowedHosts: "all",
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
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                test: /\.css/,
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
