"use strict";

import path from 'path';
import hapi from 'hapi';
import inert from 'inert';

export default function startFileServer(port, dir) {
  const server = new hapi.Server({
    connections: {
      routes: {
        files: {
          relativeTo: path.resolve(dir)
        }
      }
    }
  });
  server.connection({ port });

  server.register(inert, () => {});

  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: '.',
        redirectToSlash: true,
        index: true,
      },
    },
  });

  server.start((err) => {
    if (err) {
      throw err;
    }
    console.log('File Server running at:', server.info.uri);
  });
};
