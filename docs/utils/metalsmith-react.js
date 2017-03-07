import {renderToStaticMarkup} from 'react-dom/server';

import {join} from 'path';

export function File(name, elem) {
  return (files, ctx) => {
    const path = join(ctx.path, name + ".html");
    const text = "<!DOCTYPE html>" + renderToStaticMarkup(elem);
    files[path] = {contents: new Buffer(text), mode: "0666"};
  };
}

function processThing(files, ctx, thing) {
  if (typeof thing === 'function') {
    thing(files, ctx);
  } else if (thing) {
    for (let subThing of thing) {
      processThing(files, ctx, subThing);
    }
  }
}

export function Dir(name, fileSeq) {
  return (files, ctx) => {
    const _path = ctx.path;
    ctx.path = join(ctx.path, name);

    processThing(files, ctx, fileSeq);

    ctx.path = _path;
  };
}

export function metalsmithReact (render, ctx) {
  return function (files, metalsmith, done) {
    render(files, metalsmith).then(result => {
      ctx = Object.assign({path: '', basePath: ''}, ctx);
      processThing(files, ctx, result);
    }).then(done);
  };
}
