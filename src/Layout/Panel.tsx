import { Collapse, Typography } from 'antd-v5'
import React, { ReactNode } from 'react'
import Translate from '../Components/Translate/Translate'

type TPanel = {
  title?: ReactNode
  className?: string
  children: ReactNode
  headerClassName?: string
  bodyClassName?: string
}

const isHeading = (type: React.ReactElement['type']) =>
  typeof type === 'string' && ['h3', 'h5'].includes(type)

const injectOnClickToHeadings = (children: ReactNode): ReactNode =>
  React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child
    }

    const element = child as React.ReactElement

    if (isHeading(element.type)) {
      return React.cloneElement(element, {
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          e.stopPropagation()
        }
      })
    }

    if (element.props?.children) {
      return React.cloneElement(element, {
        children: injectOnClickToHeadings(element.props.children)
      })
    }

    return element
  })

export default function Panel({ title, className, headerClassName, bodyClassName, children }: TPanel) {
  return (
    <Collapse
      defaultActiveKey="1"
      destroyOnHidden
      expandIconPosition="end"
      className={className}
      items={[
        {
          key: '1',
          label: (
            <span className="panel-header">
              {title &&
                (typeof title === 'string' ? (
                  <Typography.Title level={5} className="mb-0 d-inline" onClick={(e) => e.stopPropagation()}>
                    <Translate>{title}</Translate>
                  </Typography.Title>
                ) : (
                  injectOnClickToHeadings(title)
                ))}
            </span>
          ),
          children,
          classNames: {
            header: headerClassName,
            body: bodyClassName
          },
          styles: {
            body: {
              position: 'relative'
            }
          }
        }
      ]}
    />
  )
}
