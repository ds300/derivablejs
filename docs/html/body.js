import style, {minWidth, colors} from './style';
import React from 'react';
import Highlight from './highlight';

const className = style.registerStyle({
  backgroundColor: colors.aoi,
  color: 'white',
});

export default function Body () {
  return (
    <div className={className}>
      <section className='left-nav'>
        <ul>
          <li><a href="#introduction">Introduction</a></li>
          <li><a href="#introduction">Other place</a></li>
        </ul>
      </section>
      <section>
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
