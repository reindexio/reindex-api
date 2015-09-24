const path = require('path');

const ExtractTextPlugin = require('extract-text-webpack-plugin');
const webpack = require('webpack');

const config = {
  debug: true,
  devtool: 'eval',
  entry: [
    './src/index',
  ],
  output: {
    path: path.join(__dirname, 'public', 'static'),
    filename: 'reindex-graphiql.js',
    publicPath: '/static/',
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        include: path.join(__dirname, 'src'),
        loaders: [
          'babel-loader?stage=0',
        ],
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract(
          'style-loader',
          'css-loader'
        ),
      },
      {
        test: /\.(otf|eot|svg|ttf|woff|woff2)/,
        loader: 'url-loader?limit=8192',
      },
    ],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    new ExtractTextPlugin('reindex-graphiql.css'),
  ],
};

if (process.env.NODE_ENV === 'production') {
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        warnings: false,
      },
    }),
    new webpack.optimize.DedupePlugin()
  );
}

module.exports = config;
