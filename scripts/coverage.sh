#!/bin/sh
mv dist dist-backup
mkdir dist
cp dist-backup/derivable.js dist/derivable.js
./node_modules/.bin/istanbul instrument dist/derivable.js > dist/derivable.instrumented.js
rm dist/derivable.js
mv dist/derivable.instrumented.js dist/derivable.js
ISTANBUL_REPORTERS=json mocha --reporter mocha-istanbul
rm -r dist
mv dist-backup dist
./node_modules/.bin/istanbul report html
./node_modules/.bin/istanbul report lcov
