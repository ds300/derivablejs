import style, {minWidth, colors} from './style';
import React from 'react';
import Highlight from './highlight';

const className = style.register `
  background-color: ${colors.teardrop};
  padding: 30px 10px 40px;
  display: flex;
  flex-flow: column;
  align-items: center;
  color: white;
  ${minWidth.tablet} {
    padding-top: 50px;
  }
  ${minWidth.desktop} {
    padding-top: 80px;
    flex-flow: row;
    align-items: flex-start;
  }
  .pitch {
    flex: 1 1 auto;
    display: flex;
    flex-flow: column;
    align-items: center;
    justify-content: center;
    h1 {
      text-align: center;
      font-weight: 100;
      margin: 0;
      margin-left: -30px;
      padding: 20px 0px;
      background-position: left center;
      background-repeat: no-repeat;
      background-size: 50px 50px;
      padding-left: 65px;
      &.declarative {
        background-image: url('/img/declarative-icon.svg');
      }
      &.functional {
        background-image: url('/img/functional-icon.svg');
      }
      &.reactive {
        background-image: url('/img/reactive-icon.svg');
      }
    }
  }
  p {
    max-width: 600px;
    ${minWidth.desktop} {
      font-size: 11pt;
      padding: 0 15px;
    }

    ${minWidth.largeDesktop} {
      font-size: 12pt;
      max-width: 450px;
    }
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
          DerivableJS lets you simply describe what your application state
          should look like and when side effects should happen. The nasty
          business of making it all work properly is taken care of.
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
          source of bugs. DerivableJS provides automatic, synchronous,
          and minimal change propagation; wisely deciding
          when side effects should happen to avoid wasted CPU cycles.
        </p>
      </div>
    </section>
  );
}
