import { APIType } from '@/Actions/ActionType'
import { getUrl } from '@/Hooks/queryHelpers'
import store from '@/store/store'
import { SET_DATA } from '@/Util/Util'

export const setLoader = (payload: number) => {
  store.dispatch({ type: APIType.LOADING_COUNT, payload })
}

export const removeAPICache = (key: string) => {
  const convertedUrl = getUrl(key)
  SET_DATA(convertedUrl, undefined)
  store.dispatch({ type: APIType.API_DATA, payload: { url: convertedUrl, data: undefined } })
}
