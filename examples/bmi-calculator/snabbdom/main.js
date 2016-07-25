/** @jsx html */
import {atom, derivation, lift, wrapPreviousState} from 'derivable';
import snabbdom from 'snabbdom';
import {html} from 'snabbdom-jsx';

// step 1.
// define atomic state & logic

const $WeightKG = atom(75);
const $HeightCM = atom(170);

function bmi (kg, cm) {
  return Math.round(kg / Math.pow(cm / 100, 2));
}

// step 2.
// derive some data
const $bmi = lift(bmi)($WeightKG, $HeightCM);

const $bodyType = $bmi.derive(bmi =>
  bmi < 18.5 ? "underweight"
  : bmi < 25 ? "normal"
  : bmi < 30 ? "overweight"
  : "obese"
);

const $dom = derivation(() =>
  <div>
    <div>
      <input
        props-type='number'
        props-value={$WeightKG.get()}
        on-input={e => $WeightKG.set(e.target.value)}/>&nbsp;
      weight (kg)
    </div>
    <div>
      <input
        props-type='range'
        on-input={e => $HeightCM.set(parseInt(e.target.value))}
        props-min={100}
        props-max={270}
        props-value={$HeightCM.get()}
        />&nbsp;
      height: {Math.round($HeightCM.get())}cm
    </div>
    <div>
      Your BMI is {$bmi.get()}, which makes you {$bodyType.get()}.
    </div>
  </div>
);

window.addEventListener('load', () => {
  const patch = snabbdom.init([
    require('snabbdom/modules/props'),
    require('snabbdom/modules/eventlisteners'),
  ]);
  $dom.react(wrapPreviousState((newNode, oldNode) => {
    patch(oldNode, newNode);
  }, document.getElementById('main')));
});
