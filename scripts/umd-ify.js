var fs = require('fs');

var header = fs.readFileSync(require.resolve('./umd-header.js')).toString();
var footer = fs.readFileSync(require.resolve('./umd-footer.js')).toString();
var sourceMap = require('source-map');

module.exports = function (bundle) {
  var map = new sourceMap.SourceMapConsumer(bundle.map);
  var node = sourceMap.SourceNode.fromStringWithSourceMap(bundle.code, map);
  node.prepend(header);
  node.add(footer);

  return node.toStringWithSourceMap();
};
