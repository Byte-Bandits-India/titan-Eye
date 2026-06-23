import { setLoader } from '@/Reducers/API/actions'
import { message } from 'antd'
import axios, { AxiosResponse } from 'axios'
import md5 from 'md5'
import AppConfig from '../config'
import { history } from './history'
import { removeEmptyObjects } from './Util'

const isJsonBlob = (data: AxiosResponse) => data instanceof Blob && data.type === 'application/json'

const parseJSON = (str: string) => {
  try {
    return typeof str === 'string' ? JSON.parse(str) : false
  } catch {
    return false
  }
}

const apiClient = axios.create({
  baseURL: `${AppConfig.API_URL}/`
})

const getToken = (token: string | null) => {
  if (token) {
    return token.includes('Bearer') ? token : `Bearer ${token}`
  }

  return undefined
}

apiClient.interceptors.request.use(
  async (config) => {
    config.url = config.url?.replace(/^\/+/, '').replace(/^(api\/)+/, '')

    if (!config.noLoader) {
      setLoader(1)
    }

    if (config.data?.password) {
      config.data.password = md5(config.data.password)
    }

    if (config.data?.currentPassword) {
      config.data.currentPassword = md5(config.data.currentPassword)
    }

    return {
      ...config,
      headers: removeEmptyObjects({
        ...config.headers,
        Authorization:
          getToken(config.headers.Authorization) || getToken(localStorage.getItem('SESSION_TOKEN'))
      })
    }
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => {
    if (!response.config.noLoader) {
      setLoader(-1)
    }

    return response
  },
  async ({ response, __CANCEL__ }) => {
    if (__CANCEL__ || !response.config.noLoader) {
      setLoader(-1)
    }

    if (response) {
      const { status } = response

      const responseData = isJsonBlob(response?.data) ? await response?.data?.text() : response?.data || {}
      const data = parseJSON(responseData) || responseData || {}

      if (status === 401) {
        message.error(data.message)
        localStorage.removeItem('SESSION_TOKEN')
        history.push('/login')

        return response
      }

      if (status >= 400 && status < 500) {
        if (data.errors && Object.keys(data.errors).length > 0) {
          errorsParser(data.errors)
        } else if (data.message) {
          message.error(data.message)
        }

        return Promise.resolve({ status, data })
      }

      if (status >= 500) {
        errorsParser(data.errors)

        return Promise.resolve({ status, data })
      }

      return Promise.resolve({ status, ...data })
    }
  }
)

const errorsParser = (errors: string | Record<string, string>) => {
  if (errors) {
    if (typeof errors === 'string') {
      message.error(errors)
    } else {
      Object.values(errors).forEach((err) => {
        message.error(err)
      })
    }
  }
}

export default apiClient
