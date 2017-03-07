"use strict";

import gaze from 'gaze';
import fileServer from './file-server';
import {env} from 'process';
import http from 'http';
import ws from 'ws';
import debugLog from './debug-log';

const debug = debugLog(__filename);

const defaultWatchPaths = [
  "javascript/**/*",
  "html/**/*",
  "content/**/*",
  "static/**/*",
];

export default function liveReloadServer(buildFn, watchPaths=defaultWatchPaths) {
  const WS_PORT = env.LIVE_RELOAD_PORT || 3001;
  const wsHttpServer = http.createServer();
  const wss = new ws.Server({ server: wsHttpServer });

  wss.on('connection', function connection(ws) {
    debug("connection with browser established");
    debug("watching paths", watchPaths);
    const watcher = gaze(watchPaths, function (event) {
        // do build
        this.on("all", () => {
          console.log("triggering live reload");
          buildFn().then(() => {
            debug("sending refresh notification");
            ws.send(JSON.stringify({message: "do an update"}));
          }).catch(err => {
            console.error(err.stack);
          });
        });
    });

    ws.on('close', function () {
      debug("closing websocket connection");
      watcher.close();
    });
  });

  wsHttpServer.listen(WS_PORT, function () {
    console.log('Live reload server listening on ' + wsHttpServer.address().port);
  });
}
