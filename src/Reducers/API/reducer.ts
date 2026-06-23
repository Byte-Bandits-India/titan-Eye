import { APIType } from '@/Actions/ActionType'
import { AnyAction, Reducer } from 'redux'

const INIT_STATE = {
  loaderCount: 0,
  API_DATA: {}
}

const reducer: Reducer<typeof INIT_STATE, AnyAction> = (state = INIT_STATE, { type, payload }) => {
  switch (type) {
    case APIType.LOADING_COUNT: {
      return {
        ...state,
        loaderCount: state.loaderCount + payload
      }
    }

    case APIType.API_DATA: {
      return {
        ...state,
        API_DATA: {
          ...state.API_DATA,
          [payload.url]: payload.data
        }
      }
    }

    default:
      return state
  }
}

export default reducer
