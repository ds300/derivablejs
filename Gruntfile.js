/**
 *
 *   grunt lint      Lint all source javascript
 *   grunt clean     Clean dist folder
 *   grunt build     Build dist javascript
 *   grunt test      Test dist javascript
 *   grunt default   Lint, Build then Test
 *
 */
module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      options: {
        asi: true,
        curly: false,
        eqeqeq: true,
        esnext: true,
        expr: true,
        forin: true,
        freeze: false,
        immed: true,
        indent: 2,
        iterator: true,
        noarg: true,
        node: true,
        noempty: true,
        nonstandard: true,
        trailing: true,
        undef: true,
        unused: 'vars',
      },
      all: ['src/**/*.js', '!src/havelock.js']
    },
    clean: {
      build: ['dist/*']
    },
    bundle: {
      build: {
        files: [{
          src: 'src/havelock.js',
          dest: 'dist/havelock'
        }]
      }
    },
    copy: {
      build: {
        files: [{
          src: 'type-definitions/havelock.d.ts',
          dest: 'dist/havelock.d.ts'
        }]
      }
    },
    jest: {
      options: {
        testPathPattern: /.*/
      }
    }
  });


  var fs = require('fs');
  var esperanto = require('esperanto');
  var copyright = fs.readFileSync('resources/COPYRIGHT')
  var stripCopyright = function (code) {
    var idx = code.indexOf(copyright);
    if (idx > -1) {
      code = code.substring(idx + copyright.length);
    }
    return code;
  };
  var uglify = require('uglify-js');

  grunt.registerMultiTask('bundle', function () {
    var done = this.async();

    this.files.map(function (file) {
      esperanto.bundle({
        entry: file.src[0],
        transform: function(source) {
          return stripCopyright(source);
        }
      }).then(function (bundle) {

        var bundled = bundle.toUmd({
          banner: copyright,
          sourceMap: true,
          sourceMapFile: 'havelock.js',
          strict: true,
          name: 'Havelock'
        });

        var babel = require('babel');

        var transformed = babel.transform(bundled.code, {
          blacklist: ["es6.tailCall"],
          sourceMaps: true,
          inputSourceMap: bundled.map,
        });

        delete transformed.map.sourcesContent;
        transformed.map.sources = transformed.map.sources.map(function (s) {
          var idx = s.lastIndexOf("/src/");
          return s.substring(idx + 1);
        });

        fs.writeFileSync(file.dest + '.js', transformed.code);
        fs.writeFileSync(file.dest + '.js.map', JSON.stringify(transformed.map, null, '\t'));

        var minifyResult = uglify.minify(transformed.code, {
          fromString: true,
          mangle: {
            toplevel: true
          },
          compress: {
            comparisons: true,
            pure_getters: true,
            unsafe: true
          },
          output: {
            max_line_len: 2048,
          },
          reserved: ['module', 'define', 'Havelock']
        });

        var minified = minifyResult.code;

        fs.writeFileSync(file.dest + '.min.js', copyright + minified);
      }).then(function(){ done(); }, function(error) {
        grunt.log.error(error.stack);
        done(false);
      });
    });
  });


  var Promise = require("bluebird");
  var exec = require('child_process').exec;

  function execp(cmd) {
    var resolve, reject;
    var promise = new Promise(function(_resolve, _reject) {
      resolve = _resolve;
      reject = _reject;
    });
    try {
      exec(cmd, function (error, out) {
        if (error) {
          reject(error);
        } else {
          resolve(out);
        }
      });
    } catch (error) {
      reject(error);
    }
    return promise;
  }

  grunt.registerTask('stats', function () {
    Promise.all([
      execp('cat dist/havelock.js | wc -c'),
      execp('git show master:dist/havelock.js | wc -c'),
      execp('cat dist/havelock.min.js | wc -c'),
      execp('git show master:dist/havelock.min.js | wc -c'),
      execp('cat dist/havelock.min.js | gzip -c | wc -c'),
      execp('git show master:dist/havelock.min.js | gzip -c | wc -c'),
    ]).then(function (results) {
      return results.map(function (result) { return parseInt(result); });
    }).then(function (results) {
      var rawNew = results[0];
      var rawOld = results[1];
      var minNew = results[2];
      var minOld = results[3];
      var zipNew = results[4];
      var zipOld = results[5];

      function space(n, s) {
        return Array(Math.max(0, 10 + n - (s||'').length)).join(' ') + (s||'');
      }

      function bytes(b) {
        return b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' bytes';
      }

      function diff(n, o) {
        var d = n - o;
        return d === 0 ? '' : d < 0 ? (' ' + bytes(d)).green : (' +' + bytes(d)).red;
      }

      function pct(s, b) {
        var p = Math.floor(10000 * (1 - (s / b))) / 100;
        return (' ' + p + '%').grey;
      }

      console.log('  Raw: ' +
        space(14, bytes(rawNew).cyan) + '       ' + space(15, diff(rawNew, rawOld))
      );
      console.log('  Min: ' +
        space(14, bytes(minNew).cyan) + pct(minNew, rawNew) + space(15, diff(minNew, minOld))
      );
      console.log('  Zip: ' +
        space(14, bytes(zipNew).cyan) + pct(zipNew, rawNew) + space(15, diff(zipNew, zipOld))
      );

    }).then(this.async()).catch(function (error) {
      setTimeout(function () {
        throw error;
      }, 0);
    });
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-jest');
  grunt.loadNpmTasks('grunt-release');

  grunt.registerTask('lint', 'Lint all source javascript', ['jshint']);
  grunt.registerTask('build', 'Build distributed javascript', ['clean', 'bundle', 'copy']);
  grunt.registerTask('test', 'Test built javascript', ['jest']);
  grunt.registerTask('default', 'Lint, build and test.', ['lint', 'build', 'stats' /*, 'test' */]);
}
