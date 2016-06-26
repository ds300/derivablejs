'use strict';

const fs = require('fs');
const process = require('process');
const exec = require('child_process').execSync;
const path = require('path');
const benchmark = require('benchmark');

// function time(filename, expected) {
//   const results = exec(filename).toString();
//   const lines = results.split('\n');
//   const timingsLine = lines.pop();
//
//   const time = timingsLine.match(/([\d.]+) total/)[1];
//
//   if (expected != null) {
//     const resultString = lines.join('\n').trim();
//     if (expected !== resultString) {
//       throw new Error("unexpected output for benchmark file ", filename);
//     }
//   }
//
//   return JSON.parse(time);
// }

function benchmark2json(b) {
  if (b.error) {
    return {error: b.error};
  } else {
    return {
      hz: b.hz,
      rme: b.stats.rme,
      samples: b.stats.sample.length,
    };
  }
}

function runBenchmark(dir) {
  // const expectedFile = path.join(dir, 'expected-output');
  // const expected = fs.existsSync(expectedFile) ? fs.readFileSync(expectedFile).toString().trim() : null;
  //
  const jsFiles = fs.readdirSync(dir).filter(f => f.match(/^[^_].*\.js$/));

  const lib2results = {};

  jsFiles.forEach(filename => {
    const lib = filename.split(".")[1];
    lib2results[lib] = [];

    console.log("running", filename);
    var fn = require(path.resolve(path.join(dir, filename)));

    var b = new benchmark.Benchmark(lib, fn);

    b.run();

    lib2results[lib] = benchmark2json(b);
    if (lib2results[lib].error) {
      console.error(lib2results[lib].error);
    }
  });

  return lib2results;
}

if (require.main === module) {
  if (process.argv.length > 2) {
    const benchmark = process.argv[2];
    console.dir(runBenchmark(path.join('benchmarks', benchmark)));
  } else {
    const bench2results = {};
    fs.readdirSync('benchmarks')
      .filter(nm => fs.lstatSync(path.join('benchmarks', nm)).isDirectory())
      .forEach(dir => {
        bench2results[dir] = runBenchmark(path.join('benchmarks', dir));
      });
    fs.writeFileSync('benchmark-results.json', JSON.stringify(bench2results));
  }
}
