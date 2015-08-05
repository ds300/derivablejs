require("babel/register");

function literateTypescript(ts) {
  "use strict";
  let result = "";
  const commentsAsHeaders = ts.split("/***");
  for (let commentAsHeader of commentsAsHeaders.slice(1)) {
    let blah = commentAsHeader.split("***/");
    let comment = blah[0];
    let code = blah[1];
    result += "\n\n" + comment.trim() + "\n";
    if (code && code.trim()) {
      result += "\n```typescript";
      result += "\n" + code.trim();
      result += "\n```\n";
    }
  }
  return result;
}


module.exports = function (grunt) {
  grunt.initConfig({
    watch: {
      files: ['examples.ts'],
      tasks: ['build'],
    },
  });
  grunt.registerTask('build', function () {
    var fs = require('fs');
    var ts = fs.readFileSync('examples.ts').toString();
    fs.writeFileSync('README.md', literateTypescript(ts));
  });
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask('default', ['build', 'watch']);
};
