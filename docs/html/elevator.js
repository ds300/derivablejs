import style, {minWidth, colors} from './style';
import React from 'react';
import Highlight from './highlight';

const className = style.register `
  background-color: ${colors.teardrop};
  padding: 10px 10px 30px;
  display: flex;
  flex-flow: column;
  align-items: center;
  color: white;
  h1 {
    text-align: center;
    font-weight: 100;
  }
  p {
    max-width: 700px;
    font-size: 11pt;
    ${minWidth.tablet} {
      font-size: 12pt;
    }
    ${minWidth.desktop} {
      font-size: 14pt;
    }
  }
`;


export default function ElevatorPitch () {
  return (
    <section className={className}>
      <div className='pitch'>
        <h1>
          Declarative
        </h1>
        <p>
          Saying is easier than doing, especially as domain complexity grows.
          DerivableJS lets you describe what your application state
          should look like, while handling the nasty business
          of satisfying your description at all times.
        </p>
      </div>
      <div className='pitch'>
        <h1>
          Functional
        </h1>
        <p>
          Pure functions and immutable data are at the heart of effective
          state management in any good system. Higher-order functions are a
          catalyst for code reuse and grokkability. DerivableJS embraces
          both with gusto.
        </p>
      </div>
      <div className='pitch'>
        <h1>
          Reactive
        </h1>
        <p>
          Manual or unprincipled change propagation can be a calamitous
          source of bugs. DerivableJS provides synchronous
          automatic change propagation and wisely dictates
          when side effects should happen.
        </p>
      </div>
    </section>
  );
}
