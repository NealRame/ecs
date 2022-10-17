const path = require("path")

const HtmlWebpackPlugin = require("html-webpack-plugin")

const outputDirectory = path.resolve(__dirname, "dist")

module.exports = {
    devtool: "inline-source-map",
    devServer: {
        static: outputDirectory,
    },
    entry: "./src/app/index.ts",
    output: {
        clean: true,
        filename: "bundle.js",
        path: outputDirectory,
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: "Development",
            filename: "index.html",
            template: "./src/app/index.html",
        }),
    ],
    mode: "development",
    module: {
        rules: [{
            test: /\.tsx?$/i,
            use: 'ts-loader',
            exclude: /node_modules/,
        }, {
            test: /\.css$/i,
            use: ['style-loader', 'css-loader'],
        }],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
}
