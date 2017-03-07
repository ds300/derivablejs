export default function (style, dest) {
  return function (files) {
    files[dest] = {contents: new Buffer(style().getStyles()), mode: "0666"};
  };
};
