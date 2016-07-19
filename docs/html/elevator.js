import style, {minWidth, colors} from './style';
import React from 'react';
import Highlight from './highlight';

const className = style.register `
  background-color: ${colors.clean_pondwater};
  padding: 10px 10px 30px;
  display: flex;
  flex-flow: column;
  align-items: center;
  color: #093f50;
  h1 {
    text-align: center;
    font-weight: 500;
  }
  .copy {
    max-width: 700px;
    padding: 0px 10px;
    border-radius: 14px;
    p {
      font-size: 11pt;
      ${minWidth.tablet} {
        font-size: 12pt;
      }
      ${minWidth.desktop} {
        font-size: 14pt;
      }
    }
  }
`;


export default function ElevatorPitch () {
  return (
    <section className={className}>
      <h1>
        Introducing Derivables
      </h1>
      <div className='copy'>
        <p>
          Derivables are a tool for managing application state. They keep your
          state consistent with itself at all times. If you've worked on big
          systems before, you know that's a mighty hard thing to do manually.
        </p>
        <p>
          More specifically, derivables make it natural to safely manage
          <strong> derived</strong> state. Derived state is stuff like:
          <em> whether or not this input form is valid</em>, or <em>the number of idle users in this IRC channel.</em>
        </p>
        <p>
          Event stream libraries often provide something similar to derivables, but they
          introduce harmful complexity by building on top of streams.
          Eliminating this complexity has remarkable benefits.
        </p>
      </div>
    </section>
  );
}
