var Promise = require('promise');
var execp = require('./execp');
require('colors');

module.exports = function () {
  return Promise.all([
    execp('cat dist/derivable.js | wc -c'),
    execp('git show master:dist/derivable.js | wc -c'),
    execp('cat dist/derivable.min.js | wc -c'),
    execp('git show master:dist/derivable.min.js | wc -c'),
    execp('cat dist/derivable.min.js | gzip -c | wc -c'),
    execp('git show master:dist/derivable.min.js | gzip -c | wc -c'),
  ]).then(function (results) {
    return results.map(function (result) { return parseInt(result); });
  }).then(function (results) {
    var rawNew = results[0];
    var rawOld = results[1];
    var minNew = results[2];
    var minOld = results[3];
    var zipNew = results[4];
    var zipOld = results[5];
    console.log("RESULTS", JSON.stringify(results));

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

  }).catch(function (error) {
    setTimeout(function () {
      throw error;
    }, 0);
  });
};

if (require.main === module) {
  module.exports();
}
