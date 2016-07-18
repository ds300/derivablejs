import style, {minWidth} from './style';
import React from 'react';

const className = style.registerStyle({
  height: '100vw',
  maxHeight: '800px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexFlow: 'column',
  'h1': {
    [minWidth.tablet]: {
      fontSize: '50px',
      padding: '30px 0px 30px 85px',
      backgroundSize: '70px 70px',
    },
    [minWidth.desktop]: {
      fontSize: '70px',
      padding: '40px 0px 40px 110px',
      backgroundSize: '90px 90px',
    },
    [minWidth.largeDesktop]: {
      fontSize: '90px',
      padding: '50px 0px 50px 120px',
      backgroundSize: '100px 100px',
    },
    fontSize: '40px',
    fontWeight: '100',
    backgroundImage: "url('/img/logo.svg')",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left center',
    backgroundSize: '60px 60px',
    paddingLeft: '70px',
    padding: '20px 0px 20px 40px',
    margin: '0',
  },
  'h2': {
    margin: '0',
    fontWeight: 100,
    [minWidth.tablet]: {
      fontSize: '30px',
    },
    [minWidth.desktop]: {
      fontSize: '35px',
    },
    [minWidth.largeDesktop]: {
      fontSize: '45px',
    },
  },
  'ul': {
    position: 'absolute',
    top: '0px',
    right: '0px',
    listStyleType: 'none',
    margin: '0',
    padding: '0',
    'li': {
      display: 'inline',
      'a': {
        textDecoration: 'none',
        display: 'inline-block',
        padding: '13px 23px',
        color: '#999',
        '&:hover': {
          backgroundColor: '#F5F5F5',
          color: '#000',
        },
      },
    },
  },
});

export default function Header () {
  return (
    <section className={className}>
      <h1>
        DerivableJS
      </h1>
      <h2>
        State made simple
      </h2>
      <ul>
        <li>
          <a href="docs/">Documentation</a>
        </li>
        <li>
          <a href="https://github.com/ds300/derivablejs">Source</a>
        </li>
      </ul>
    </section>
  );
}
