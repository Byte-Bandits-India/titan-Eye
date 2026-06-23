import OpenSaveIcon from '@/assets/images/save_arrow_right_filled_icon.svg'
import SaveSearchIcon from '@/assets/images/save_search_filled_icon.svg'
import Button from '@/Components/Button'
import ModalBox from '@/Components/ModalBox/ModalBox'
import { ColumnsType, TableBox } from '@/Components/TableBox'
import Translate from '@/Components/Translate/Translate'
import useDidUpdateEffect from '@/Hooks/useDidUpdateEffect'
import { Field, Form, FormProvider, FormProviderBag } from '@/NewComponents/Form'
import apiClient from '@/Util/apiClient'
import { GET_DATA, validateAccess } from '@/Util/Util'
import Yup from '@/Util/YupMethod'
import { FunnelPlotOutlined } from '@ant-design/icons'
import { Image, Layout, message, Popconfirm, Skeleton, Space, Tooltip } from 'antd'
import { ConfigProvider } from 'antd-v5'
import clsx from 'clsx'
import { getIn } from 'formik'
import { omit } from 'lodash'
import React, { FormEvent, ReactElement, useRef, useState } from 'react'
import TableLayout from './TableLayout'

const { Sider, Content } = Layout

type TObject = { page?: number } & Record<string, unknown>

type TFilterLayout = {
  children: ReactElement<TFilterLayoutProps> | (ReactElement<TFilterLayoutProps> | null)[]
  filter: ReactElement<TFilterComponentProps>
  addButton?: {
    title: string
    onClick: () => void
    access: string
  }
  saveFilter?: boolean
} & TFilterLayoutProps

type TFilterComponentProps = {
  onSubmit?: (values: FormEvent<HTMLElement> & TObject) => void
} & TFilterLayoutProps

type TFilterLayoutProps = {
  filterData?: string
}

type TSaveSearch = {
  name: string
}

type TListSavedSearch = {
  id: NonEmptyString
  name: string
  filters: FormEvent<HTMLElement> & TObject
}

export default function FilterLayout({ addButton, saveFilter, children, ...props }: TFilterLayout) {
  const [showSearchName, setShowSearchName] = useState(false)
  const [showSavedList, setShowSavedList] = useState(false)
  const [leads, setLeads] = useState<TListSavedSearch[]>([])
  const [filter, setFilter] = useState<ReactElement<TFilterComponentProps> | null>(props.filter)
  const propsFilterData = props.filterData ? GET_DATA(props.filterData) : undefined
  const [filterData, setFilterData] = useState(propsFilterData)

  const saveSearchRef = useRef<FormProviderBag<TSaveSearch>>(null)

  useDidUpdateEffect(() => {
    setFilterData(propsFilterData)
  }, [propsFilterData])

  useDidUpdateEffect(() => {
    setFilter(props.filter)
  }, [props.filter])

  const responsiveFilter = () => {
    const x = document.getElementById('mobile-sider-menu')

    if (x) {
      if (x.style.display === 'block') {
        x.style.display = 'none'
      } else {
        x.style.display = 'block'
      }
    }
  }

  const AddButton = () =>
    addButton ? (
      validateAccess(addButton.access) ? (
        <Button onClick={addButton.onClick} variant="primary" className="btn-block">
          <i className="flaticon-plus" /> <Translate>{addButton.title}</Translate>
        </Button>
      ) : null
    ) : null

  const handleSaveSearch = (values: TSaveSearch) => {
    apiClient
      .post('saved-filters', {
        ...values,
        filters: omit(filterData, ['page', 'perPage', 'totalCount']),
        pathname: window.location.pathname
      })
      .then(({ status }) => {
        if (status === 201) {
          message.success('Search saved successfully')
          setShowSearchName(false)
        }
      })
  }

  const getSavedFilters = () => {
    if (!showSavedList) {
      setShowSavedList(true)
    }

    apiClient
      .get<TListSavedSearch[]>('saved-filters', {
        params: {
          pathname: window.location.pathname
        }
      })
      .then(({ status, data }) => {
        if (status === 200) {
          setLeads(data)
        }
      })
  }

  const handleDeleteSearch = (id: ID) => {
    apiClient.delete(`saved-filters/${id}`).then(({ status }) => {
      if (status === 200) {
        message.success('Search deleted successfully')
        getSavedFilters()
      }
    })
  }

  const columns: ColumnsType<TListSavedSearch> = [
    {
      title: 'Name',
      dataIndex: 'name',
      width: '70%'
    },
    {
      title: 'Actions',
      render: (v, row) => (
        <Space>
          <Button
            variant="primary"
            onClick={() => {
              filter?.props.onSubmit?.(row.filters)
              setFilterData(row.filters)
              setShowSavedList(false)
              setFilter(null)
              setTimeout(() => setFilter(props.filter), 1)
            }}>
            Apply
          </Button>
          <Popconfirm title="Are you sure?" onConfirm={() => handleDeleteSearch(row.id)}>
            <Button
              variant="primary"
              className="btn-glow delete-field"
              icon={<i className="flaticon-delete-2 mr-0" />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Layout className="app-sidebar">
      <ModalBox
        open={showSearchName}
        title="Save Search"
        onOk={() => saveSearchRef.current?.submitForm()}
        onCancel={() => setShowSearchName(false)}>
        <FormProvider
          innerRef={saveSearchRef}
          initialValues={{
            name: ''
          }}
          validationSchema={saveSchema}
          onSubmit={handleSaveSearch}>
          <Form>
            <div className="form-fields">
              <Field name="name" label="Search Name" />
            </div>
          </Form>
        </FormProvider>
      </ModalBox>
      <ModalBox open={showSavedList} width={500} title="Saved List" onCancel={() => setShowSavedList(false)}>
        <TableBox dataSource={leads} columns={columns} />
      </ModalBox>
      <div className="mobile-filter">
        <Button>
          <FunnelPlotOutlined onClick={responsiveFilter} />
        </Button>
      </div>
      <Sider width={230} trigger={null} collapsible collapsed={false} id="mobile-sider-menu">
        <div className={clsx('filter-section', !(saveFilter || addButton) && 'pt-3')}>
          {(saveFilter || addButton) && (
            <div
              className="sticky-top mb-3"
              style={{
                paddingTop: 29,
                backgroundColor: 'white'
              }}>
              {saveFilter && (
                <Space className="justify-content-center w-100 mb-3">
                  <Tooltip title="Save current search">
                    <Button
                      variant="text"
                      className="p-0"
                      icon={<Image preview={false} width={30} src={OpenSaveIcon} />}
                      onClick={() => {
                        setShowSearchName(true)
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Open saved search">
                    <Button
                      variant="text"
                      className="p-0"
                      icon={<Image preview={false} width={30} src={SaveSearchIcon} />}
                      onClick={() => getSavedFilters()}
                    />
                  </Tooltip>
                </Space>
              )}
              {addButton && <AddButton />}
            </div>
          )}
          {filter ? (
            <ConfigProvider
              theme={{
                cssVar: { key: 'filter-ant5' },
                components: {
                  Input: {
                    controlHeight: 30
                  },
                  Select: {
                    controlHeight: 30,
                    optionHeight: 22,
                    optionPadding: '5px 12px'
                  },
                  DatePicker: {
                    controlHeight: 30,
                    paddingInline: 7
                  },
                  Button: {
                    controlHeight: 30
                  }
                }
              }}>
              {React.cloneElement(filter, {
                ...(filterData && {
                  filterData,
                  onSubmit: (values) => {
                    props.filter.props.onSubmit?.({ ...(filterData?.page && { page: 1 }), ...values })
                    setFilterData({ ...(filterData?.page && { page: 1 }), ...values })
                  }
                })
              })}
            </ConfigProvider>
          ) : (
            <Space size="middle" direction="vertical" className="w-100 mt-3">
              {[...Array(4)].map((item, i) => (
                <Skeleton.Input key={i} active className="w-100" />
              ))}
            </Space>
          )}
        </div>
      </Sider>
      <Layout className="site-layout">
        <Content className="site-layout-background px-3">
          {React.Children.map(children, (child) => {
            if (child && getIn(child?.type, 'name') === TableLayout.name) {
              return React.cloneElement(child, {
                ...{ filterData: props.filterData, addButton: AddButton }
              })
            }

            return child
          })}
        </Content>
      </Layout>
    </Layout>
  )
}

const saveSchema = Yup.object().shape({
  name: Yup.string().required()
})
