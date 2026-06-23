import { Col, Row } from 'antd'
import React from 'react'
import './Footer.scss'
import './Header.scss'

export default class Footer extends React.PureComponent {
  render() {
    return (
      <div className="footer">
        <Row>
          <Col
            xs={{ span: 24, order: 1 }}
            sm={{ span: 24, order: 1 }}
            md={{ span: 12, order: 1 }}
            lg={{ span: 12, order: 1 }}>
            <div className="copyright-text">
              <p>© Copyright 2021 Accqrate, All Rights Reserved.</p>
            </div>
          </Col>

          <Col
            xs={{ span: 24, order: 2 }}
            sm={{ span: 24, order: 2 }}
            md={{ span: 12, order: 2 }}
            lg={{ span: 12, order: 2 }}>
            <div className="footer-links">
              <ul>
                <li>
                  <a>Privacy Policy</a>
                </li>
                <li>
                  <a>Terms and Conditions</a>
                </li>
              </ul>
            </div>
          </Col>
        </Row>
      </div>
    )
  }
}
