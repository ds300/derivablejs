var execp = require('./execp');
var fs = require('fs');

module.exports = function () {
  var script = "docgen/target/docgen.js";
  var api = "derivable.api.edn";
  var tsOut = "dist/derivable.d.ts";
  var htmlOut = "index.html";

  if (!fs.existsSync("docs")) {
    fs.mkdirSync("docs");
  }

  var rootQ = null;
  if (fs.existsSync(script)) {
    console.log("docgen exists, skipping boot");
    rootQ = {then: function (cb) { return cb(); }};
  } else {
    console.log("doicgen doesn't exist, compiling it...");
    rootQ = execp("boot cljs", "./docgen");
  }
  return rootQ
    .then(function () {
      return execp(["node", script, api, tsOut, htmlOut].join(" "));
    })
    .then(function () {
      console.log("all done");
    })
    .catch(function (error) {
      setTimeout(function () {
        throw error;
      }, 0);
    });
};

if (require.main === module) {
  module.exports();
}
