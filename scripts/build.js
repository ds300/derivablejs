var Promise = require('promise');
var rollup = require('rollup');
var fs = require('fs');
var path = require('path');
var umdIfy = require('./umd-ify');

module.exports = function (entry, destDir) {
  return rollup.rollup({
    // The bundle's starting point. This file will be
    // included, along with the minimum necessary code
    // from its dependencies
    entry: entry
  }).then(function (bundle) {
    // Alternatively, let Rollup do it for you
    // (this returns a promise). This is much
    // easier if you're generating a sourcemap
    return bundle.generate({
      format: 'cjs',
      sourceMap: 'true',
      sourceMapFile: path.resolve(path.join(destDir, 'derivable.js'))
    });
  }).then(umdIfy).then(function (bundle) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir);
    }
    fs.writeFileSync(path.join(destDir, 'derivable.js'), bundle.code);
    fs.writeFileSync(path.join(destDir, 'derivable.js.map'), bundle.map.toString());
  });
};
