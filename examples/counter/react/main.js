import {atom} from 'derivable';
import React from 'react';
import {render} from 'react-dom';
import {reactive} from 'react-derivable';

const increment = x => x + 1;
const decrement = x => x - 1;

const Counter = reactive(class extends React.Component {
  constructor () {
    super();
    this.$Count = atom(0);
  }
  render () {
    return (
      <div>
        <p>The count is currently {this.$Count.get()}.</p>
        <button onClick={() => this.$Count.swap(increment)}> increment </button>
        <button onClick={() => this.$Count.swap(decrement)}> decrement </button>
      </div>
    );
  }
});

window.addEventListener('load', () => {
  render(<Counter/>, document.getElementById('main'));
});
