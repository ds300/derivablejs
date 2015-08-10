require("babel/register");

var lts = require("../literateTypescript");

module.exports = function (grunt) {
  grunt.initConfig({
    watch: {
      files: ['maybe.ts'],
      tasks: ['build'],
    },
  });
  grunt.registerTask('build', function () {
    lts.processFile('maybe.ts', 'maybe.js', 'README.md');
  });
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask('default', ['build', 'watch']);
};
