import style, {minWidth, colors} from './style';
import React from 'react';
import Highlight from './highlight';

const className = style.registerStyle({
  backgroundColor: colors.aoi,
  padding: '40px 10px',
  color: 'white',
  'h1': {
    textAlign: 'center',
    fontWeight: 100,
  },
});

export default function FRP () {
  return (
    <section className={className}>
      <h1>
        Functional Reactive
      </h1>
      <p>
        Think declarative. Think pure. DerivableJS is
        stripped-down FRP magic.
      </p>
    </section>
  );
}
