import style, {minWidth} from './style';
import React from 'react';
import CounterExamples from './counter-examples';

const className = style.register `
`;

export default function Views () {
  return (
    <section className={className}>
      <h1>
        View library agnostic
      </h1>
      <p>
        Building a solid visual UI involves careful management of state and
        side effects. Traditional monolithic front-end frameworks don't seem
        to leverage the fact that views are just state and rendering
        them is just a side effect.
      </p>
      <p>
        Happily, recent years have seen a glut of UI libraries
        which are clued-in. DerivabeJS should work neatly out-of-the-box with
        any of them which don't tie you into a particular state/effects
        management model, e.g&nbsp;
        <a href="https://github.com/paldepind/snabbdom">
          snabbdom
        </a>
        &nbsp;or&nbsp;
        <a href="https://github.com/Matt-Esch/virtual-dom">
          virtual-dom
        </a>
      </p>
      <p>
        Meanwhile, more opinionated libraries like React require special bindings.
        DerivableJS has official support for React in the form of&nbsp;
        <a href="https://github.com/andreypopp/react-derivable">
          react-derivable
        </a>
        .
      </p>
    </section>
  );
};
