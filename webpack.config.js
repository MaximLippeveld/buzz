const path = require("path")

module.exports = {
    entry: './src/js/index.js',
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "bin"),
        publicPath: "/bin/"
    },
    watchOptions: {
        poll: 1000,
        ignored: /node_modules/,
    },
    devServer: {
        port: 8080,
        contentBase: path.resolve(__dirname, "dist")
    },
    mode: "development",
}