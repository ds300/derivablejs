import {atom, lift} from 'derivable';

window.addEventListener('load', () => {
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

  // step 3
  // react to the changing data
  function bindText(elemID, $value) {
    const elem = document.getElementById(elemID);
    $value.react(v => {
      elem.textContent = v.toString();
    });
  }

  bindText('bmi-label', $bmi);
  bindText('body-type-label', $bodyType);
  bindText('height-label', $HeightCM);

  // step 4
  // hook up input events
  function bindValue(elemID, $Value) {
    const elem = document.getElementById(elemID);
    elem.addEventListener('input', e => {
      $Value.set(e.target.value);
    });
    $Value.react(v => {
      if (elem.value != v) elem.value = v;
    });
  }

  bindValue('height', $HeightCM);
  bindValue('weight', $WeightKG);
});
