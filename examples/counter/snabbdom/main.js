/** @jsx html */
import {atom, derive, wrapPreviousState} from 'derivable';
import snabbdom from 'snabbdom';
import {html} from 'snabbdom-jsx';

const increment = x => x + 1;
const decrement = x => x - 1;

const $Count = atom(0);

const $dom = derive(() =>
  <div>
    <p>The count is currently {$Count.get()}.</p>
    <button on-click={() => $Count.update(increment)}> increment </button>
    <button on-click={() => $Count.update(decrement)}> decrement </button>
  </div>
);

window.addEventListener('load', () => {
  const patch = snabbdom.init([
    require('snabbdom/modules/eventlisteners'),
  ]);
  $dom.react(wrapPreviousState((newNode, oldNode) => {
    patch(oldNode, newNode);
  }, document.getElementById('main')));
});
