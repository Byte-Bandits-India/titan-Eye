import { UserType } from '@/Actions/ActionType'
import setAuthorizationToken from '@/Actions/setAuthorizationToken'
import { UserInfo } from '@/Reducers/types'
import store from '@/store/store'
import { omit } from 'lodash'
import apiClient from './apiClient'

export default function getUserToken(token: string = localStorage.getItem('SESSION_TOKEN') || '') {
  return apiClient.get<Result<UserInfo>>('v2/sessions/user/get-by-token').then(({ status, data }) => {
    if (status === 200) {
      setAuthorizationToken(token)

      const result =
        data.result.shouldChangePassword || data.result.shouldSetupMfa
          ? omit(data.result, 'company', 'roleData')
          : data.result

      store.dispatch({ type: UserType.GET_USER, payload: result })

      return result
    }

    return undefined
  })
}
