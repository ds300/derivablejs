import build from './build';
import liveReloadServer from './utils/live-reload-server';
import fileServer from './utils/file-server';
import {env} from 'process';
import {execSync} from 'child_process';
import Promise from 'bluebird';

console.log("Doing initial build");
build().then(() => {
  if (env.DEV_MODE) {
    console.log("Starting live reload server.");
    liveReloadServer(build);
  }
  fileServer(env.PORT || 3000, 'build');
}).catch(err => {
  console.log(err.stack);
  throw err;
});
