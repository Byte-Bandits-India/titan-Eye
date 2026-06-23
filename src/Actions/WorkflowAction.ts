import { message } from 'antd'
import apiClient from '../Util/apiClient'

// ---------- Workflows ------- //

export const readWorkflow = <R>(id: string) =>
  apiClient
    .get<Result<R>>(`workflows/readWorkflow/${id}`)
    .then((res) => {
      if (res.data.success) {
        return res.data.result
      }

      return undefined
    })
    .catch(() => {
      message.error('Getting workflows failed')
    })

export const getWeekAndTimeEntries = <R>(weekId: string) => {
  const url = `workflows/getWeekAndTimeEntries/${weekId}`

  return apiClient
    .get<Result<R>>(url)
    .then((res) => {
      if (res.data.success) {
        return res.data.result
      }

      return undefined
    })
    .catch(() => {
      message.error('Getting times failed')
    })
}

export const approveWorkflow = <R>(id: string) =>
  apiClient.put<Result<R>>(`workflows/approve/${id}`, {}).then((res) => {
    if (res.data?.success) {
      return res.data.result
    }
  })

export const rejectWorkflow = <R, T = unknown>(id: string, data: T) =>
  apiClient.put<Result<R>>(`workflows/reject/${id}`, data).then((res) => {
    if (res.data?.success) {
      return res.data.result
    }
  })

