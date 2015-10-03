var path = require('path');

var express = require('express');
var httpProxy = require('http-proxy');
var webpack = require('webpack');
var config = require('./webpack.config.dev');

var app = express();
var proxy = httpProxy.createProxyServer({ target: 'http://localhost:5000' });
var compiler = webpack(config);

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}));

app.use(require('webpack-hot-middleware')(compiler));

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.all('/graphql', function(req, res) {
  proxy.web(req, res);
});

app.listen(3000, 'localhost', function(err) {
  if (err) {
    console.log(err);
    return;
  }

  console.log('Listening at http://localhost:3000');
});
