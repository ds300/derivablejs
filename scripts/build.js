var Promise = require('promise');
var rollup = require('rollup');
var fs = require('fs');
var path = require('path');
var umdIfy = require('./umd-ify');
var uglify = require('uglify-js');

function _writeBundle(bundle, filename) {
  fs.writeFileSync(filename, bundle.code + '\n//# sourceMappingURL=' + filename.split('/').pop() + '.map');
  fs.writeFileSync(filename + '.map', bundle.map.toString());
}

function writeBundle(bundle, filename, minFilename) {
  _writeBundle(bundle, filename);
  if (minFilename) {
    try {
      var minifyResult = uglify.minify(bundle.code, {
        inSourceMap: filename + '.map',
        outSourceMap: minFilename + '.map',
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
      _writeBundle(minifyResult, minFilename);
    } catch (e) {
      console.error(JSON.stringify(e));
      throw e;
    }
  }
}

module.exports = function (entry, destDir) {
  if (!fs.existsSync(entry)) {
    throw new Error('file does not exist:', entry);
  }
  var outJS = path.join(destDir, 'derivable.js');
  var outUMDJS = path.join(destDir, 'derivable.umd.js');
  var outMinJS = path.join(destDir, 'derivable.min.js');
  var outMinUMDJS = path.join(destDir, 'derivable.umd.min.js');

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
    .then(function (bundle) {
      // write out files
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir);
      }
      writeBundle(bundle, outJS, outMinJS);
      return bundle;
    })
    .then(function (bundle) {
      if (require('process').argv.indexOf('--umd') > -1) {
        var umdBundle = umdIfy(bundle);
        writeBundle(umdBundle, outUMDJS, outMinUMDJS);
      }
      return bundle;
    })
    .catch(function (error) {
      console.error(error.stack);
      throw error;
    });
};

if (require.main === module) {
  module.exports('src/module.js', 'dist');
}
