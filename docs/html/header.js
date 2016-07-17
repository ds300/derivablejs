import style from './style';
import React from 'react';

const className = style.registerStyle({
  'h1': {
    color: 'magenta',
    fontSize: '80pt',
    margin: '0 auto',
  },
});

export default function Header () {
  return <section className={className}><h1>This is DerivableJS</h1></section>;
}
