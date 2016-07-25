module.exports = {
  entry: './main.js',
  output: {
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015', 'react'],
          plugins: ["transform-object-rest-spread"]
        }
      }
    ]
  },
  resolve: {
    extensions: ['', '.js', '.json']
  }
};
