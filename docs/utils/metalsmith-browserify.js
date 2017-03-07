import browserify from 'browserify';

export default function (src, dest) {
  return (files, _, done) => {
    var buf = "";
    browserify(src)
    .transform("babelify", {presets: ["es2015", "react"]})
      .bundle()
      .on('data', s => buf += s)
      .on('end', () => {
        files[dest] = {contents: new Buffer(buf), mode: '0666'};
        done();
      });
  };
};
