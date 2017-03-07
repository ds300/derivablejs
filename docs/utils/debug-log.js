import {env, cwd} from 'process';

const debug = _filename => {
  _filename = _filename.replace(cwd(), '');
  return function () {
    if (env.DEBUG_MODE) {
      console.log.apply(console, ["DEBUG:", _filename].concat([].slice.call(arguments,0)));
    }
  };
};

export default debug;
