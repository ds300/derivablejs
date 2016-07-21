import style, {minWidth} from './style';
import React from 'react';
import CounterExamples from './counter-examples';

const className = style.register `
`;

export default function Views () {
  return (
    <section className={className}>
      <h1>
        View Library Agnostic
      </h1>
      <p>
        View rendering involves managing state and side effects, but DerivableJS
        doesn't care what kinds of state you deal with or what kinds of side
        effects you produce. There are officially-supported bindings for React
        and Snabbdom.
      </p>
      <CounterExamples/>
    </section>
  );
};
