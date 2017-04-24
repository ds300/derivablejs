import {atom, derive, transaction} from 'derivable';
import React from 'react';
import {render} from 'react-dom';
import {reactive} from 'react-derivable';

/**
 * Define lift as a function of derive
 */
function lift (fn) {
  return derive.bind(null, fn);
}

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


/**
 * A controlled input field whose value is backed by an atom
 */
const AtomBackedInput = reactive(({$Value, ...props}) => (
  <input
    {...props}
    value={$Value.get()}
    onChange={e => $Value.set(e.target.value)}
    />
));

/**
 * A self-contained component for calculating BMIs in either
 * imperial or metric measurements
 */
const BMICalculator = reactive(class extends React.Component {
  constructor () {
    super();

    // define atomic state
    this.$WeightLB = atom(150);
    this.$HeightCM = atom(170);

    // define metric weight proxy
    this.$WeightKG = this.$WeightLB.proxy({
      get: lb => Math.round(lb * 0.453592),
      set: (_, kg) => Math.round(kg / 0.453592),
    });


    // define imperial height proxies
    const $HeightFeetInches = this.$HeightCM.proxy({
      get: cm2feetInches,
      set: (_, fi) => feetInches2cm(fi),
    });
    this.$Feet = $HeightFeetInches.proxy({
      get: ({feet}) => feet,
      set: ({inches}, feet) => ({feet: parseInt(feet), inches}),
    });
    this.$Inches = $HeightFeetInches.proxy({
      get: ({inches}) => inches,
      set: ({feet}, inches) => ({feet, inches: parseInt(inches)})
    });

    // derive BMI and body type classification
    this.$bmi = lift(bmi)(this.$WeightKG, this.$HeightCM);

    this.$classification = this.$bmi.derive(bmi => {
      if (bmi < 18.5) {
        return "underweight";
      } else if (bmi < 25) {
        return "normal";
      } else if (bmi < 30) {
        return "overweight";
      } else {
        return "obese";
      }
    });
  }

  render () {
    return (
      <div>
        <div>
          <AtomBackedInput type='number' $Value={this.$WeightLB}/>&nbsp;
          weight (lb)
        </div>
        <div>
          <AtomBackedInput type='number' $Value={this.$WeightKG}/>&nbsp;
          weight (kg)
        </div>
        <div>
          <AtomBackedInput
            type='range'
            $Value={this.$HeightCM}
            min="100"
            max="270"/>&nbsp;
          height: {Math.round(this.$HeightCM.get())}cm
        </div>
        <div>
          <AtomBackedInput
            type='range'
            $Value={this.$Feet}
            min="3"
            max="8"/>&nbsp;
          <AtomBackedInput
            type='range'
            $Value={this.$Inches}
            min="0"
            max="11"/>&nbsp;
          height: {this.$Feet.get()}&rsquo;{this.$Inches.get()}&rdquo;
        </div>
        <div>
          Your BMI is {this.$bmi.get()}
          , which makes you {this.$classification.get()}.
        </div>
      </div>
    );
  }
});

window.addEventListener('load', () => {
  render((<BMICalculator />), document.getElementById('main'));
});
