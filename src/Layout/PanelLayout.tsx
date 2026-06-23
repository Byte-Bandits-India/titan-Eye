import { Col, Row, Space } from 'antd-v5'
import clsx from 'clsx'
import { CSSProperties, ReactNode } from 'react'
import Translate from '../Components/Translate/Translate'

type TPanelLayout = {
  title?: ReactNode
  status?: ReactNode
  noBottom?: boolean
  children: ReactNode
  style?: CSSProperties
  centerSection?: ReactNode
  rightSection?: ReactNode
}

export default function PanelLayout({
  title,
  status,
  children,
  noBottom,
  style,
  centerSection,
  rightSection
}: TPanelLayout) {
  return (
    <div className={clsx('panel-layout', noBottom && 'mb-0')} style={style}>
      <Row justify="space-between" align="middle">
        <Col>
          {title &&
            (typeof title === 'string' ? (
              <h2 className="panel-title">
                <Translate>{title}</Translate>{' '}
                {status && (
                  <>
                    (<Translate>{status}</Translate>)
                  </>
                )}
              </h2>
            ) : (
              title
            ))}
        </Col>
        {centerSection && (
          <Col>
            <Space>{centerSection}</Space>
          </Col>
        )}
        {rightSection && (
          <Col>
            <Space>{rightSection}</Space>
          </Col>
        )}
      </Row>
      <Space direction="vertical" className="w-100" size="large">
        {children}
      </Space>
    </div>
  )
}
