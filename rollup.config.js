import buble from "rollup-plugin-buble";
import uglify from "rollup-plugin-uglify";

export default [
  {
    input: "src/index.js",
    plugins: [buble()],
    output: [
      {
        format: "cjs",
        exports: "named",
        file: "dist/derivable.js",
        sourcemap: true
      },
      {
        format: "es",
        exports: "named",
        file: "dist/derivable.es.js",
        sourcemap: true
      },
      {
        format: "umd",
        name: "Derivable",
        exports: "named",
        file: "dist/derivable.umd.js",
        sourcemap: true
      }
    ]
  },
  {
    input: "src/index.js",
    plugins: [
      buble(),
      uglify({
        mangle: {
          toplevel: true
        },
        compress: {
          pure_getters: true
        },
        output: {
          max_line_len: 2048
        }
      })
    ],
    output: [
      {
        format: "umd",
        name: "Derivable",
        exports: "named",
        file: "dist/derivable.umd.min.js",
        sourcemap: true
      }
    ]
  }
];
