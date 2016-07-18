import React from 'react';
import Header from './header';
import Body from './body';
import FRP from './frp';
import ElevatorPitch from './elevator';
import Promise from 'bluebird';
import {File, Dir} from '../utils/metalsmith-react';

const indexPage = (
  <html>
    <head>
      <link rel="stylesheet" type="text/css" href="css/normalize.css" />
      <link rel="stylesheet" type="text/css" href="css/syntax-highlight-style.css" />
      <link rel="stylesheet" type="text/css" href="css/bundle.css" />
      <link href='https://fonts.googleapis.com/css?family=Open+Sans:300,400,700,300italic' rel='stylesheet' type='text/css' />
      <link rel="shortcut icon" href="favicon.ico" />
      <link rel="apple-touch-icon" href="favicon.png" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <title>DerivableJS</title>
    </head>
    <body>
      <Header/>
      <ElevatorPitch/>
      <script type="text/javascript" src="js/bundle.js"></script>
    </body>
  </html>
);

// render should return a promise of either a File or a Dir or an iterable of same
export default function render (files, metalsmith) {
  // someone might need files or metalsmith to pass data context around,
  // but probably not

  return Promise.resolve([
    File("index", indexPage),
  ]);
}
