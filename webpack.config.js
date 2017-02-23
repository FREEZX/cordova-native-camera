var webpack = require('webpack');
module.exports = {
  entry: {
    index: './src/js/index.js'
  },
  devtool: 'source-map',
  output: {
    path: __dirname + '/www/',
    filename: '[name].js'
  },
  plugins: [
    new webpack.IgnorePlugin(/cordova*/)
  ]
};
