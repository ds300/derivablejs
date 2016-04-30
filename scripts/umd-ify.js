var fs = require('fs');

var header = fs.readFileSync(require.resolve('./umd-header.js')).toString();
var numHeaderLines = header.split('\n').length;
var footer = fs.readFileSync(require.resolve('./umd-footer.js')).toString();
var sourceMap = require('source-map');

module.exports = function (bundle) {
  bundle.code = header + '\n' + bundle.code + '\n' + footer + '\n//# sourceMappingURL=derivable.js.map';
  for (var i in bundle.map) {
    console.log("mmap", i);
  }
  var map = new sourceMap.SourceMapConsumer(bundle.map);
  map.eachMapping(function (mapping) {
    mapping.generatedLine += numHeaderLines;
  });

  bundle.map = sourceMap.SourceMapGenerator.fromSourceMap(map);

  return bundle;
};
