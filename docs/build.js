import Metalsmith from 'metalsmith';
import dotenv from 'dotenv';
import {execSync} from 'child_process';
import {env} from 'process';
import {readFileSync} from 'fs';
import Promise from 'bluebird';

import autoprefixer from './utils/metalsmith-autoprefixer';
import beautify from 'metalsmith-beautify';
import cleanCSS from 'metalsmith-clean-css';
import * as react from './utils/metalsmith-react';
import style from './utils/metalsmith-free-style';
import browserify from './utils/metalsmith-browserify';

import uglify from 'uglify-js';

dotenv.config({silent: true});

export default function build () {
  execSync('rm -rf build');
  execSync('cp -L -R static build');

  // invalidate require cache
  Object.keys(require.cache).forEach(c => {
    if (c.indexOf('/node_modules/') === -1) {
      delete require.cache[c];
    }
  });

  const index = require('./html/index').default;
  const css = require('./html/style').default;

  const smith = Metalsmith('./').source('static'); // pick up static resources

  // compile react templates to html
  smith.use(react.metalsmithReact(index));

  // build js bundle
  smith.use(browserify('javascript/index.js', 'js/bundle.js'));

  // build styles
  smith.use(style(() => css, 'css/bundle.css'));

  // prefix styles
  smith.use(autoprefixer({ browsers: ['last 2 version'] }));


  if (env.DEV_MODE) {
    // inject live reload script for client side
    const reloadScript = readFileSync('./utils/live-reload-client.js')
      .toString()
      .replace('__PORT__', env.LIVE_RELOAD_PORT || 3001);
    const reloadString = `<script>${reloadScript}</script>`;

    smith.use((files) => {
      Object.keys(files).forEach(file => {
        if (file.match(/.*\.html$/)) {
          files[file].contents = new Buffer(
            files[file].contents.toString()
            .replace('</body>', reloadString + '</body>'));
          }
        }
      );
    });

    // make things beautiful
    beautify({
      indent_size: 2,
      indent_char: ' ',
      wrap_line_length: 0,
      end_with_newline: true,
      css: true,
      html: true
    });
  } else {
    // minify js & css
    smith.use((files) => {
      const small = uglify.minify([files['js/bundle.js'].contents.toString()], {
        fromString: true,
        preserveComments: false,
        removeOriginal: false,
        concat: false,
        sourceMap: false,
        output: {},
      }).code;
      files['js/bundle.js'].contents = new Buffer(small);
    });
    smith.use(cleanCSS());
  }

  return new Promise((resolve, reject) => {
    smith.build((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

if (require.main === module) {
  build().catch(err => {
    console.error(err.stack);
    throw err;
  });
}
