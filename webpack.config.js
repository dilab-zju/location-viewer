const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

module.exports = {
  context: __dirname,
  target: 'web',

  devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-source-map',

  entry: path.resolve(__dirname, 'src/index.ts'),

  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
  },

  resolve: {
    extensions: [".ts", ".js"],
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ['awesome-typescript-loader'],
      },
      {
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre',
      },
    ].concat(process.env.NODE_ENV === 'production' ? [
      {
        test: /\.styl$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'stylus-loader'],
        }),
      },
    ] : [
      {
        test: /\.styl$/,
        use: ['style-loader', 'css-loader', 'stylus-loader'],
      },
    ]),
  },

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      title: 'location-viewer',
      filename: `index.html`,
      template: `src/markup.html`,
      chunks: 'main',
    }),
    new webpack.EnvironmentPlugin({ NODE_ENV: 'development' }),
  ].concat(process.env.NODE_ENV === 'production' ? [
    new ExtractTextPlugin('styles.css'),
  ] : []),

  devServer: {
    contentBase: __dirname,
    hot: true,
    host: '0.0.0.0',
  }
}
