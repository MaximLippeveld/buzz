const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    mode: "development",
    resolve: {
        alias: {
            app: path.resolve(__dirname, './src/js/app.js')
        }
    },
    entry: './src/js/index.js',
    context: __dirname,
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'build'),
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            inject: 'body'
        }),
        new MiniCssExtractPlugin({
            filename: '[name].css'
        })
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
            },
            {
                test: /\.(svg|feather)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/[hash][ext][query]'
                }
            },
            {
                // nw.js package file
                test: /assets\/package\.json$/,
                type: 'asset/resource',
                generator: {
                    filename: 'package.json'
                }
            }
        ]
    }
};