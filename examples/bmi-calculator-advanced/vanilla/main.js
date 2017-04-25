import {atom, transaction, derive} from 'derivable';

/**
 * calculate a body mass index from a weight (in kilograms) and a
 * height (in centimeters)
 */
function bmi (weightKG, heightCM) {
  return Math.round(weightKG / Math.pow(heightCM / 100, 2));
}

/**
 * convert a length in centimters to feet and inches components,
 * rounding to the nearest inch
 */
function cm2feetInches (cm) {
  const totalInches = (cm * 0.393701);
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - (feet * 12));
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

/**
 * convert a length in feet and inches to centimeters, rounding to the
 * nearest centimeter.
 */
function feetInches2cm ({feet, inches}) {
  return Math.round(((feet * 12) + inches) / 0.393701);
}


const $ = document.getElementById.bind(document);

window.addEventListener('load', () => {

  // step 1.
  // define atomic state

  const $Weight = {lb: atom(150)};
  const $Height = {cm: atom(170)};
  const $FocusedWeightUnit = atom(null);

  // step 2.
  // derive some data

  $Weight.kg = $Weight.lb.proxy({
    get: lb => Math.round(lb * 0.453592),
    set: (_, kg) => Math.round(kg / 0.453592),
  });

  $Height.feetInches = $Height.cm.proxy({
    get: cm2feetInches,
    set: (_, feetInches) => feetInches2cm(feetInches),
  });

  const [$feet, $inches] = $Height.feetInches.derive(['feet', 'inches']);

  const $bmi = derive(bmi, $Weight.kg, $Height.cm);

  const $bodyType = $bmi.derive(bmi =>
    bmi < 18.5 ? "underweight"
    : bmi < 25 ? "normal"
    : bmi < 30 ? "overweight"
    : "obese"
  );

  // step 3
  // react to the changing data

  function setText(elemID, $value) {
    $value.react(v => {
      $(elemID).textContent = v.toString();
    });
  }

  setText('bmi-label', $bmi);
  setText('body-type-label', $bodyType);
  setText('height-cm-label', $Height.cm);
  setText('height-feet-inches-label', derive`${$feet}'${$inches}"`);

  function setValue(elemID, $value, when) {
    $value.react(v => {
      $(elemID).value = v;
    }, {when: when || true});
  }

  setValue('weight-lb', $Weight.lb, $FocusedWeightUnit.is('lb').not());
  setValue('weight-kg', $Weight.kg, $FocusedWeightUnit.is('kg').not());
  setValue('height-cm', $Height.cm);
  setValue('height-feet', $feet);
  setValue('height-inches', $inches);

  // step 4
  // hook up input events

  // range sliders
  $('height-cm').addEventListener('input', e => {
    $Height.cm.set(e.target.value);
  });
  $('height-feet').addEventListener('input', e => {
    $Height.feetInches.swap(({inches}) => ({
      inches, feet: parseInt(e.target.value)
    }));
  });
  $('height-inches').addEventListener('input', e => {
    $Height.feetInches.swap(({feet}) => ({
      feet, inches: parseInt(e.target.value)
    }));
  });

  // weight inputs
  ['lb', 'kg'].forEach(unit => {
    const inputElem = $('weight-' + unit);
    inputElem.addEventListener('input', transaction(e => {
      $FocusedWeightUnit.set(unit);
      $Weight[unit].set(e.target.value);
    }));
  });
});
