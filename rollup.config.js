import uglify from 'rollup-plugin-uglify';

var config = {
  input: 'src/index.js',
  output: [
    {
      format: 'cjs',
      exports: 'named',
      file: 'dist/derivable.js',
      sourcemap: true
    },
    {
      format: 'es',
      exports: 'named',
      file: 'dist/derivable.es.js',
      sourcemap: true
    },
    {
      format: 'umd',
      name: 'Derivable',
      exports: 'named',
      file: 'dist/derivable.umd.js',
      sourcemap: true
    }
  ]
};

if (process.env.MINIFY) {
  config.plugins = [
    uglify({
      mangle: {
        toplevel: true
      },
      compress: {
        pure_getters: true
      },
      output: {
        max_line_len: 2048,
      }
    })
  ];
  config.output = [
    {
      format: 'umd',
      name: 'Derivable',
      exports: 'named',
      file: 'dist/derivable.umd.min.js',
      sourcemap: true
    }
  ];
}

export default config;
