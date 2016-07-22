import {atom, lift, transaction} from 'derivable';

// step 1.
// define atomic state and constants

const $Weight = atom(60);
const $EditingUnit = atom(null);

const $HeightCM = atom(150);

function bmi (weightKG, heightCM) {
  return weightKG / Math.pow(heightCM / 100, 2);
}

// step 2.
// derive some data

// use kg by default
const $activeUnit = $EditingUnit.or('kg');

const $weightLB = $activeUnit.switch(
  "lb", $Weight,
  "kg", $Weight.derive(w => w / 0.453592)
).derive(Math.round);

// another way to achieve the same effect:
const $weightKG = $activeUnit.is("kg")
  .then($Weight, $Weight.derive(w => w * 0.453592))
  .derive(Math.round);

const $bmi = lift(bmi)($weightKG, $HeightCM);

window.addEventListener('load', () => {
  const $ = document.getElementById.bind(document);
  // step 3
  // react to the changing data

  $bmi.react(bmi => {
    $('bmi').textContent = bmi.toString();
  });

  $weightLB.react(lb => {
    $('weight-lb').value = lb;
  }, {
    // avoid setting input value while user is typing
    when: $EditingUnit.is('lb').not()
  });

  $weightKG.react(kg => {
    $('weight-kg').value = kg;
  }, { when: $EditingUnit.is('kg').not() });

  $HeightCM.react(h => {
    $('height-label').textContent = h.toString();
  });

  // step 4
  // hook up input events

  $('height-range').addEventListener('input', e => {
    $HeightCM.set(e.target.value);
  });

  ['lb', 'kg'].forEach(unit => {
    $('weight-' + unit).addEventListener('input', e => {
      $Weight.set(e.target.value);
    });
    // changing > 1 thing at once, so wrap in a transaction to
    // avoid intermediate reactions
    $('weight-' + unit).addEventListener('focus', transaction(e => {
      $EditingUnit.set(unit);
      $Weight.set(e.target.value);
    }));
  });
});
