import { Tooltip } from 'antd'
import React, { memo, useEffect, useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { useSelector } from '../Hooks/redux'
import apiClient from '../Util/apiClient'

function LowInventoryChecker() {
  const history = useHistory()
  const [check, setCheck] = useState(false)
  const companyInfo = useSelector((state) => state.users.companyInfo)

  const getData = () => {
    if (companyInfo) {
      apiClient.get<Result<[]>>('stock-below-reorder-level').then(({ status, data }) => {
        if (status === 200) {
          setCheck(!!data.result.length)
        }
      })
    }
  }

  useEffect(() => {
    getData()
    const unRegister = history.listen(({ pathname }) => {
      if (pathname.startsWith('/app')) {
        getData()
      }
    })

    return () => {
      unRegister()
    }
  }, [])

  return check ? (
    <li>
      <Link to="/app/stock-below-reorder-level" className="ant-dropdown-link settings">
        <Tooltip title="Low Inventory">
          <i className="flaticon-supplier low-inventory-icon" />
        </Tooltip>
      </Link>
    </li>
  ) : null
}

export default memo(LowInventoryChecker)
