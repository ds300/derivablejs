/** @jsx html */
import {atom, derivation, wrapPreviousState} from 'derivable';
import snabbdom from 'snabbdom';
import {html} from 'snabbdom-jsx';

const increment = x => x + 1;
const decrement = x => x - 1;

function Counter () {
  const $Count = atom(0);

  return derivation(() =>
    <div>
      <p>The count is currently {$Count.get()}.</p>
      <button on-click={() => $Count.swap(increment)}> increment </button>
      <button on-click={() => $Count.swap(decrement)}> decrement </button>
    </div>
  );
}

window.addEventListener('load', () => {
  const patch = snabbdom.init([
    require('snabbdom/modules/eventlisteners'),
  ]);
  Counter().react(wrapPreviousState((newNode, oldNode) => {
    patch(oldNode, newNode);
  }, document.getElementById('main')));
});
