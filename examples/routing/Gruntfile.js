require("babel/register");

var lts = require("../literateTypescript");

module.exports = function (grunt) {
  grunt.initConfig({
    watch: {
      files: ['router.ts'],
      tasks: ['build'],
    },
  });
  grunt.registerTask('build', function () {
    lts.processFile('router.ts', 'router.js', 'README.md');
  });
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask('default', ['build', 'watch']);
};
