var Promise = require('promise');
var rollup = require('rollup');
var fs = require('fs');
var path = require('path');
var umdIfy = require('./umd-ify');
var uglify = require('uglify-js');

module.exports = function (entry, destDir) {
  if (!fs.existsSync(entry)) {
    throw new Error('file does not exist:', entry);
  }
  var outJS = path.join(destDir, 'derivable.js');
  var outMap = outJS + '.map';
  var outMinJS = path.join(destDir, 'derivable.min.js');
  var outMinMap = outMinJS + '.map';

  return rollup
    .rollup({
      // The bundle's starting point. This file will be
      // included, along with the minimum necessary code
      // from its dependencies
      entry: entry
    })
    .then(function (bundle) {
      // Alternatively, let Rollup do it for you
      // (this returns a promise). This is much
      // easier if you're generating a sourcemap
      return bundle.generate({
        format: 'cjs',
        sourceMap: 'true',
        sourceMapFile: path.resolve(outJS)
      });
    })
    .then(umdIfy)
    .then(function (bundle) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir);
      }
      fs.writeFileSync(outJS, bundle.code);
      fs.writeFileSync(outMap, bundle.map.toString());
      return bundle;
    })
    .then(function (bundle) {
      try {
        var minifyResult = uglify.minify(bundle.code, {
          inSourceMap: outMap,
          outSourceMap: 'derivable.min.js.map',
          fromString: true,
          mangle: {
            toplevel: true
          },
          compress: {
            comparisons: true,
            pure_getters: true,
            conditionals: true,
            join_vars: true,
          },
          output: {
            max_line_len: 2048,
          },
          reserved: ['module', 'define', 'Derivable']
        });
      } catch (e) {
        console.error(JSON.stringify(e));
        throw e;
      }

      fs.writeFileSync(outMinJS, minifyResult.code);
      fs.writeFileSync(outMinMap, minifyResult.map.toString());
    })
    .catch(function (error) {
      console.error(error.stack);
      throw error;
    });
};

if (require.main === module) {
  module.exports('src/module.js', 'dist');
}
