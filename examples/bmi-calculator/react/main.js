import {atom, derive} from 'derivable';
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
 * A self-contained component for calculating BMIs in either
 * imperial or metric measurements
 */
const BMICalculator = reactive(class extends React.Component {
  constructor () {
    super();

    // define atomic state
    this.$WeightKG = atom(75);
    this.$HeightCM = atom(175);

    // derive BMI and body type
    this.$bmi = lift(bmi)(this.$WeightKG, this.$HeightCM);

    this.$bodyType = this.$bmi.derive(bmi =>
      bmi < 18.5 ? "underweight"
      : bmi < 25 ? "normal"
      : bmi < 30 ? "overweight"
      : "obese"
    );
  }

  render () {
    return (
      <div>
        <div>
          <input
            type='number'
            value={this.$WeightKG.get()}
            onChange={e => this.$WeightKG.set(e.target.value)}/>&nbsp;
          weight (kg)
        </div>
        <div>
          <input
            type='range'
            value={this.$HeightCM.get()}
            onChange={e => this.$HeightCM.set(e.target.value)}
            min="100"
            max="270"/>&nbsp;
          height: {Math.round(this.$HeightCM.get())}cm
        </div>
        <div>
          Your BMI is {this.$bmi.get()}, which makes you {this.$bodyType.get()}.
        </div>
      </div>
    );
  }
});

window.addEventListener('load', () => {
  render((<BMICalculator />), document.getElementById('main'));
});
