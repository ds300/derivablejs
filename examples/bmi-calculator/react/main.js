import {atom, lift, transaction} from 'derivable';
import React from 'react';
import {render} from 'react-dom';
import {reactive} from 'react-derivable';


function bmi (weightKG, heightCM) {
  return Math.round(weightKG / Math.pow(heightCM / 100, 2));
}

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

function feetInches2cm ({feet, inches}) {
  return ((feet * 12) + inches) / 0.393701;
}


class SemiControlledInput extends React.Component {
  componentWillMount () {
    this.$focused = atom(false);
  }
  componentDidMount () {
    this.props.$Value.react(v => {
      this.refs.input.value = Math.round(v);
    }, {
      when: this.$focused.not()
    });
  }
  render () {
    const {$Value, ...props} = this.props;
    return (
      <input
        ref="input"
        {...props}
        onChange={e => $Value.set(e.target.value)}
        onFocus={() => this.$focused.set(true)}
        onBlur={() => this.$focused.set(false)}
        />
    );
  }
};

const BMICalculator = reactive(class extends React.Component {
  constructor () {
    super();

    // define atomic state
    this.$WeightKG = atom(60);
    this.$WeightLB = this.$WeightKG.lens({
      get: kg => kg / 0.453592,
      set: (_, lb) => lb * 0.453592,
    });
    this.$HeightCM = atom(150);
    this.$HeightFeetInches = this.$HeightCM.lens({
      get: cm2feetInches,
      set: (_, fi) => feetInches2cm(fi),
    });

    this.$Feet = this.$HeightFeetInches.lens({
      get: ({feet}) => feet,
      set: ({inches}, feet) => ({feet: parseInt(feet), inches}),
    });
    this.$Inches = this.$HeightFeetInches.lens({
      get: ({inches}) => inches,
      set: ({feet}, inches) => ({feet, inches: parseInt(inches)})
    });

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
        <SemiControlledInput type='number' $Value={this.$WeightLB}/> weight (lb)<br/>
        <SemiControlledInput type='number' $Value={this.$WeightKG}/> weight (kg)<br/>
        <SemiControlledInput
          type='range'
          $Value={this.$HeightCM}
          min="100"
          max="270"/>&nbsp;
        height: {Math.round(this.$HeightCM.get())}cm <br/>
        <SemiControlledInput
          type='range'
          $Value={this.$Feet}
          min="3"
          max="8"/>&nbsp;
        <SemiControlledInput
          type='range'
          $Value={this.$Inches}
          min="0"
          max="11"/>&nbsp;
        height: {this.$Feet.get()}&rsquo;{this.$Inches.get()}&rdquo; <br/>
        Your BMI: {this.$bmi.get()} <br/>
        You are: {this.$classification.get()} <br/>
      </div>
    );
  }
});

window.addEventListener('load', () => {
  render((<BMICalculator />), document.getElementById('main'));
});
