var Promise = require('promise');
var exec = require('child_process').exec;

module.exports = function execp(cmd, cwd) {
  return new Promise(function(resolve, reject) {
    try {
      exec(cmd, {cwd: cwd || "./"}, function (error, out) {
        if (error) {
          reject(error);
        } else {
          resolve(out);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};
