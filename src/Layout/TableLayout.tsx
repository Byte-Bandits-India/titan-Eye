import { Col, Row, Space, Tooltip } from 'antd-v5'
import { flatten } from 'flat'
import _ from 'lodash'
import React, { ReactNode, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import Button from '../Components/Button'
import ModalBox from '../Components/ModalBox/ModalBox'
import Translate from '../Components/Translate/Translate'
import { RadioGroup } from '../NewComponents/Form'
import apiClient from '../Util/apiClient'
import { GET_DATA, removeEmptyKeys, validateAccess } from '../Util/Util'

type TTableLayout = {
  title: string | ReactNode
  children: ReactNode
  rightSection?: ReactNode
  resetFilters?: boolean
  addButton?: {
    title: string
    onClick: () => void
    access: string
  }
  filterData?: string
} & (
  | {
      exportUrl: string
      detailed?: boolean
    }
  | {
      exportUrl?: never
      detailed?: never
    }
)

export default function TableLayout({
  title,
  exportUrl = '',
  rightSection,
  resetFilters,
  addButton,
  filterData,
  detailed,
  children
}: TTableLayout) {
  const [exportType, setExportType] = useState('simple')
  const [visible, setVisible] = useState(false)

  const exportExcel = () => {
    apiClient
      .get<Blob>(exportUrl, {
        params: _.omit(
          flatten(
            removeEmptyKeys({
              ...(filterData ? GET_DATA(filterData) : {}),
              ...(detailed && { exportType })
            })
          ),
          ['page', 'perPage', 'totalCount']
        ),
        responseType: 'blob'
      })
      .then(({ status, data, headers }) => {
        if (status === 200) {
          const a = document.createElement('a')
          a.href = window.URL.createObjectURL(data)
          a.download = JSON.parse(headers['content-disposition'].split('filename=')[1].split(';')[0])
          document.body.appendChild(a)
          a.click()
          a.remove()
          setVisible(false)
        }
      })
  }

  return (
    <div className="table-layout">
      <ModalBox
        title="Export Excel"
        width={400}
        open={visible}
        onOk={exportExcel}
        okText="Export"
        onCancel={() => setVisible(false)}>
        <RadioGroup
          name="exportType"
          value={exportType}
          onChange={(n, v) => setExportType(v)}
          options={[
            { label: 'Simple', value: 'simple' },
            { label: 'Detailed', value: 'detailed' }
          ]}
        />
      </ModalBox>
      <Row justify="space-between" align="middle">
        <Col>
          {title &&
            (typeof title === 'string' ? (
              <h2 className="table-title">
                <Translate>{title}</Translate>
              </h2>
            ) : (
              <Translate>{title}</Translate>
            ))}
        </Col>
        <Col className="pt-1">
          <Space>
            {rightSection}
            {resetFilters && <ResetButton />}
            {exportUrl && (
              <Tooltip title={<Translate>Export Excel</Translate>} placement="left">
                <Button
                  variant="text"
                  className="d-inline-flex align-items-center p-0"
                  onClick={() => (detailed ? setVisible(true) : exportExcel())}>
                  <i
                    style={{ fontSize: '25px' }}
                    className="text-success flaticon-csv-file-format-extension no-margin d-inline-flex"
                  />
                </Button>
              </Tooltip>
            )}
          </Space>
        </Col>
      </Row>
      {addButton && (
        <div className="add-button">
          {typeof addButton === 'function'
            ? React.createElement(addButton)
            : validateAccess(addButton.access) && (
                <Button onClick={addButton.onClick} variant="primary" className="btn-block">
                  <i className="flaticon-plus" /> <Translate>{addButton.title}</Translate>
                </Button>
              )}
        </div>
      )}
      {children}
    </div>
  )
}

const ResetButton = () => {
  const { resetForm, submitForm } = useFormContext()

  return (
    <Button
      onClick={() => {
        resetForm()
        submitForm()
      }}>
      Reset Filters
    </Button>
  )
}
