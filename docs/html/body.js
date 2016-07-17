import style, {minWidth} from './style';
import React from 'react';
import Highlight from './highlight';

const className = style.registerStyle({
  padding: '30px',
  'p': {
    border: '1px solid black',
    padding: '30px',
    '&:hover': {
      border: '1px solid white',
    },
    '&.dotted': {
      border: '1px dotted red',
      cursor: 'pointer',
      '.smiley': {
        fontWeight: '900',
      },
    },
  },
});

export default function Body () {
  return (
    <div>
      <section className='left-nav'>
        <ul>
          <li><a href="#introduction">Introduction</a></li>
          <li><a href="#introduction">Other place</a></li>
        </ul>
      </section>
      <section className={className}>
        <div className="container">
          <div className="doc-part">
            <p>some words about something</p>
          </div>
          <div className="code-part">
            <Highlight block={true} code={`function () {\n  return false;\n}\n`} />
          </div>
        </div>
      </section>
    </div>
  );
}
