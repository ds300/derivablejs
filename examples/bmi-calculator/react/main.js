import {atom, lift} from 'derivable';
import React from 'react';
import {render} from 'react-dom';
import {reactive} from 'react-derivable';

/**
 * calculate a body mass index from a weight (in kilograms) and a
 * height (in centimeters)
 */
function bmi (weightKG, heightCM) {
  return Math.round(weightKG / Math.pow(heightCM / 100, 2));
}

/**
 * A controlled input field whose value is backed by an atom
 */
const $Input = reactive(class $Input extends React.Component {
  render () {
    const {$Value, ...props} = this.props;
    return (
      <input
        ref="input"
        {...props}
        value={$Value.get()}
        onChange={e => $Value.set(e.target.value)}
        />
    );
  }
});

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
          <$Input type='number' $Value={this.$WeightKG}/> weight (kg)
        </div>
        <div>
          <$Input
            type='range'
            $Value={this.$HeightCM}
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
