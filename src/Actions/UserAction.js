import { message } from 'antd-v5'
import apiClient from '../Util/apiClient'
import { UserType } from './ActionType'
import setAuthorizationToken from './setAuthorizationToken'

const convertToQuery = (query) => {
  let url = ''

  if (query && Object.keys(query).length > 0) {
    const queryArr = Object.keys(query)
      .map((val) => `${val}=${query[val]}`)
      .join('&')
    url += `?${queryArr}`
  }

  return url
}

export const register = (data) =>
  apiClient.post('networks/register', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const logoutUser = () =>
  function (dispatch) {
    return apiClient.post('v2/sessions/user/logout').then(({ status }) => {
      if (status === 204) {
        setAuthorizationToken()
        dispatch({ type: UserType.GET_USER, payload: false })

        return {}
      }

      return false
    })
  }

// ---------- User ---------- //

export const updateUser = (id, data) =>
  function (dispatch) {
    return apiClient.put(`users/update/${id}`, data).then((res) => {
      if (res.data.success) {
        dispatch({ type: UserType.GET_USER, payload: res.data.result })

        return res.data.result
      }

      return undefined
    })
  }

export const sendUserInvitation = (data) =>
  apiClient.put('users/sendInvitation', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const resetUserPassword = (id, data) =>
  apiClient.put(`v2/sessions/user/reset-password/${id}`, data).then((res) => {
    if (res.data.success) {
      return res.data
    }

    return undefined
  })

// ---------- Tokens ---------- //

export const validateToken = (token) =>
  apiClient.get(`tokens/validateToken/${token}`).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const closeToken = (token) =>
  apiClient.put(`tokens/closeToken/${token}`).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

// ---------- Company ---------- //

export const createCompanyByInvitation = (data) =>
  apiClient.post('companies/createCompanyByInvitation', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

// ---------- Master Upload ---------- //

export const masterUpload = (data) =>
  apiClient.post('masterUpload/upload', data).then(({ status, data }) => {
    if (status === 200) {
      if (data.success) {
        message.success(`${data.success} success`)
      }

      return data.errors || []
    }

    return undefined
  })

// ---------- Currency ---------- //

export const getActiveCurrencies = (data) =>
  apiClient.get('currencies/getAllActive', data).then((res) => {
    if (res.data.success) {
      return res.data.result.map((val) => ({
        ...val,
        label: `${val.code} - ${val.name}`,
        value: val.code
      }))
    }

    return []
  })

// ---------- Clients ---------- //

export const getActiveClients = () =>
  apiClient.get('clients/getAllActive').then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

// ---------- Projects ---------- //

export const addProject = (data) =>
  apiClient.post('projects', data).then(({ data, status }) => {
    if (status === 201) {
      return data.result
    }

    return undefined
  })

export const getProjects = (query) => {
  const url = query ? `projects?${query}` : 'projects'

  return apiClient.get(url).then(({ data, status }) => {
    if (status === 200) {
      return data.result.map((item) => ({
        label: `${item.code} - ${item.name}`,
        value: item.code,
        ...item
      }))
    }

    return undefined
  })
}

// ---------- Time Vesting ---------- //

export const addTimeEntry = (data) =>
  apiClient.post('timeEntries/add', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const getTimeEntriesByEmployee = (employee, query) => {
  const url = query
    ? `timeEntries/getByEmployee/${employee}${convertToQuery(query)}`
    : `timeEntries/getByEmployee/${employee}`

  return apiClient.get(url).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })
}

export const getTimeEntryById = (id) => {
  const url = `timeEntries/byId/${id}`

  return apiClient.get(url).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })
}

export const updateTimeEntry = (id, data) =>
  apiClient.put(`timeEntries/update/${id}`, data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const deleteTimeEntry = (id) =>
  apiClient.delete(`timeEntries/${id}`).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const submitTimeEntry = (data) =>
  apiClient.post('timeEntries/submit', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const returnTimeEntry = (data) =>
  apiClient.post('timeEntries/return', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const startTimer = (data) =>
  apiClient.put('timeEntries/startTimer', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const endTimer = (data) =>
  apiClient.put('timeEntries/endTimer', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

// ---------- Roles ---------- //

export const addRole = (data) =>
  apiClient.post('roles/add', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const getRoles = (query) => {
  const url = query ? `roles/getAll?${query}` : 'roles/getAll'

  return apiClient.get(url).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })
}

export const updateRoles = (data) =>
  apiClient.put('roles/updateAll', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

// ------------ Expense categories -----------//

export const getExpenseCategories = (data) =>
  apiClient.get('expense-categories/', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const getCategoryById = (id) =>
  apiClient.get(`expense-categories/byId/${id}`).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const addCategory = (data) =>
  apiClient.post('expense-categories/add', data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const updateCategory = (id, data) =>
  apiClient.put(`expense-categories/update/${id}`, data).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })

export const getWarehouseCodes = (params) =>
  apiClient.get('warehouses/get-codes', { params }).then(({ status, data }) => {
    if (status === 200) {
      return data.map((item) => ({ label: item.warehouse, value: item.warehouse, ...item }))
    }

    return []
  })

export const getLocationsByWarehouse = (params) =>
  apiClient
    .get('warehouses/get-locations', {
      params
    })
    .then(({ status, data }) => {
      if (status === 200) {
        return data.map((item) => ({ label: item.location, value: item.location, ...item }))
      }

      return []
    })

export const getRacksByLocation = (params) =>
  apiClient
    .get('warehouses/get-racks', {
      params
    })
    .then(({ status, data }) => {
      if (status === 200) {
        return data.map((item) => ({ label: item.rack, value: item.rack, ...item }))
      }

      return []
    })

/**
 * @typedef {Object} Params
 * @property {import('@/Util/Options').MasterOptionTypes | import('@/Util/Options').MasterOptionTypes[]} type - The type of options to fetch.
 */

/**
 * Fetches options by type from the API.
 *
 * @param {Params} params - The parameters to be sent with the request.
 * @returns {Promise<Record<Params['type'], import('@/NewComponents/Form').TOption[]>>} A promise that resolves to an object containing options grouped by type.
 */
export const getOptionsByType = (params) =>
  apiClient.get('options/getByType', { params }).then(({ status, data }) => {
    if (status === 200) {
      return data
    }

    return {}
  })

export const getMaterial = async (params) => {
  try {
    const material = params.material?.trim()

    if (material?.length > 2) {
      const { status, data } = await apiClient.get('warehouse-products/search', {
        params: {
          ...params,
          material
        }
      })

      if (status === 200) {
        return data.map((item) => ({
          label: item.basic.materialCodeDesc,
          value: item.basic.materialCode,
          ...item
        }))
      }
    }

    return []
  } catch {
    return []
  }
}

export const getStockCost = (params) =>
  apiClient
    .get('stocks/get-stock-cost', {
      params
    })
    .then(({ status, data }) => {
      if (status === 200) {
        return data
      }

      return undefined
    })

export const getLogs = (query) => {
  const url = `logs/getLogs/${convertToQuery(query)}`

  return apiClient.get(url).then((res) => {
    if (res.data.success) {
      return res.data.result
    }

    return undefined
  })
}

/**
 * Check stock availability for a product.
 *
 * @param {Object} params - The parameters for the stock check.
 * @param {string | string[]} params.materialCode - An array of material codes (strings).
 * @param {boolean} [params.expired] - A boolean indicating whether to check for expired stock.
 * @returns {Promise<Array<quantity: number; status: string; materialCode: string; materialDescription: string; unit: string; warehouse: string; value: number;>>} A Promise that resolves to an object representing stock data.
 *
 */
export const stockCheck = (params) =>
  apiClient
    .get('stocks/check', {
      params
    })
    .then(({ status, data }) => {
      if (status === 200) {
        return data
      }

      return []
    })
