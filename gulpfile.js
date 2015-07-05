var gulp = require("gulp");
var mocha = require('gulp-mocha');

require('babel/register')

var sourcemaps = require("gulp-sourcemaps");
var babel = require("gulp-babel");
var browserify = require("gulp-browserify");

gulp.task("default", function () {
  return gulp.src("ratom.js")
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("dist"));
});

gulp.task("watch", function () {
    return gulp.watch("ratom.js", ["default", "test"]);
});

gulp.task("test", function () {
  return gulp.src("test/*.js")
    .pipe(mocha());
});
