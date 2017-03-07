import minimatch from 'minimatch';
import postcss from 'postcss';
import Promise from 'bluebird';
import autoprefixer from 'autoprefixer';

export default function plugin (opts) {
  var opts = opts || {};
  return (files, metalsmith, done) => {
    var styles = Object.keys(files).filter(minimatch.filter("*.css", { matchBase: true }));
    var promises = styles.map(function (file, index, arr) {
      return postcss([autoprefixer(opts)]).process(files[file].contents.toString()).then(result => {
        result.warnings().forEach(warn => {
          console.warn(warn.toString());
        });
        return [file, result.css];
      });
    });

    Promise.all(promises).then(results => {
      results.forEach(([file, css]) => {
        files[file].contents = new Buffer(css);
      });
    }).then(done);
  };
}
