import { Steps } from 'antd'
import React from 'react'
import ButtonBox from '../Components/ButtonBox/ButtonBox'

const { Step } = Steps

export default class WizardSteps extends React.PureComponent {
  render() {
    return (
      <section className="wizard-section">
        <div className="wizard-steps">
          <Steps current={1} percent={60}>
            <Step title="Company Setup" />
            <Step title="Financial Year" />
            <Step title="Account Chart" />
          </Steps>
        </div>
        <div className="action-items">
          <ButtonBox type="default" variable="standard">
            Previous
          </ButtonBox>
          <ButtonBox type="secondary" variable="secondary" className="search">
            Skip
          </ButtonBox>
        </div>
      </section>
    )
  }
}
