

module.exports = function (grunt) {
  grunt.registerTask('build', function () {
    var done = this.async();
    var browserify = require("browserify");
    var babelify = require("babelify");
    var fs = require("fs");
    if (!fs.existsSync("js")) {
      fs.mkdirSync("js");
    }
    browserify().add("./todo.js")
      .transform(babelify)
      .bundle()
      .on("error", function (err) { console.log("Error : " + err.message); })
      .pipe(fs.createWriteStream("./js/todo.js"))
      .on("end", done);
  });
  grunt.registerTask('default', "Build junk", ['build'])
};
