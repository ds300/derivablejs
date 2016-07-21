import style, {minWidth} from './style';
import React from 'react';
import Highlight from './highlight';
import {render} from 'react-dom';

const counterClassName = style.register `
display: flex;
flex-flow: column;
`;

const counterOptions = [
  {
    name: 'React',
    id: 'react',
    file: 'counter-examples/react/main.js',
  },
  {
    name: 'Snabbdom',
    id: 'snabbdom',
    file: 'counter-examples/snabbdom/main.js',
  },
];

const CounterMenu = () => (
  <ul className='picker'>
    {counterOptions.map(({name, id}) => {
      return <li key={id}><a data-target={id}>{name}</a></li>;
    })}
  </ul>
);

export default () => {
  const fs = module['req' + 'uire']('fs');
  return (
    <div className={counterClassName}>
      <div id='counter-examples-menu'></div>
      <div className='options'>
        {counterOptions.map(({file, id}) => {
          return <Highlight block={true} code={fs.readFileSync(file).toString()} />;
        })}
      </div>
    </div>
  );
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    render(<CounterMenu/>, document.getElementById('counter-examples-menu'));
  });
}
