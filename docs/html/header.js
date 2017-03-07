import style, {minWidth} from './style';
import React from 'react';

const className = style.register `
  height: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 800px;
  flex-flow: column;
  h1 {
    ${minWidth.tablet} {
      font-size: 50px;
      padding: 30px 0px 30px 85px;
      background-size: 70px 70px;
    }
    ${minWidth.desktop} {
      font-size: 70px;
      padding: 40px 0px 40px 110px;
      background-size: 90px 90px;
    }
    ${minWidth.largeDesktop} {
      font-size: 90px;
      padding: 50px 0px 50px 120px;
      background-size: 100px 100px;
    }
    font-size: 40px;
    font-weight: 100;
    background-image: url('/img/logo.svg');
    background-repeat: no-repeat;
    background-position: left center;
    background-size: 60px 60px;
    padding: 20px 0px 20px 70px;
    margin: 0;
  }
  h2 {
    margin: 0;
    font-weight: 100;
    ${minWidth.tablet} {
      font-size: 30px;
    }
    ${minWidth.desktop} {
      font-size: 35px;
    }
    ${minWidth.largeDesktop} {
      font-size: 45px;
    }
  }
  p {
    text-align: center;
    padding: 20px;
    max-width: 500px;
  }
  ul {
    position: absolute;
    top: 0px;
    right: 0px;
    list-style-type: none;
    margin: 0;
    padding: 0;
    li {
      display: inline;
      a {
        text-decoration: none;
        display: inline-block;
        padding: 13px 23px;
        color: #999;
        &:hover {
          background-color: #F5F5F5;
          color: #000;
        }
      }
    }
  }
`;

export default function Header () {
  return (
    <section className={className}>
      <h1>
        DerivableJS
      </h1>
      <h2>
        State made simple
      </h2>
      <p>
        A clean and unobstrusive microframework for managing
        state and side effects in JavaScript.
      </p>
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
