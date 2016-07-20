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
  .pitch {
    display: flex;
    flex-flow: column;
    align-items: center;
    justify-content: center;
    h1 {
      text-align: center;
      font-weight: 100;
      margin: 0;
      padding: 20px 0px;
      background-position: left center;
      background-repeat: no-repeat;
      background-size: 50px 50px;
      padding-left: 65px;
      &.declarative {
        background-image: url('/img/declarative-icon.svg');
      }
      &.functional {
        padding-left: 60px;
        padding-right: 5px;
        background-image: url('/img/functional-icon.svg');
      }
      &.reactive {
        padding-left: 55px;
        padding-right: 10px;
        background-image: url('/img/reactive-icon.svg');
      }
    }
  }
  p {
    max-width: 700px;
  }
`;


export default function ElevatorPitch () {
  return (
    <section className={className}>
      <div className='pitch'>
        <h1 className='declarative'>
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
        <h1 className='functional'>
          Functional
        </h1>
        <p>
          Pure functions and immutable data tend to be at the heart of effective
          state management in robust systems. Higher-order functions are a
          boon for code reuse and grokkability. DerivableJS embraces
          both with gusto.
        </p>
      </div>
      <div className='pitch'>
        <h1 className='reactive'>
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
