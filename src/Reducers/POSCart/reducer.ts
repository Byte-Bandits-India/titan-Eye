import { AnyAction, Reducer } from 'redux'
import { CartType } from '../../Actions/ActionType'
import { POSState } from './interfaces'

const INIT_STATE: POSState = {
  cartItems: [],
  billsDiscount: null,
  billsCharge: null
}

const DEFAULT_ACTION = {
  type: '',
  payload: null
}

const reducer: Reducer<POSState, AnyAction> = (state = INIT_STATE, { type, payload } = DEFAULT_ACTION) => {
  switch (type) {
    case CartType.SET_BILLS_DISCOUNT: {
      return {
        ...state,
        billsDiscount: payload
      }
    }

    case CartType.SET_BILLS_CHARGE: {
      return {
        ...state,
        billsCharge: payload
      }
    }

    case CartType.SET_CART: {
      return {
        ...state,
        cartItems: payload
      }
    }

    case CartType.ADD_TO_CART: {
      const existingIndex = state.cartItems.findIndex((item) => item.product === payload.product)

      if (existingIndex >= 0) {
        state.cartItems[existingIndex] = {
          ...payload
        }
      } else {
        const tempProductItem = {
          ...payload
        }
        state.cartItems.push(tempProductItem)
      }

      return {
        ...state,
        cartItems: state.cartItems
      }
    }

    case CartType.EMPTY_CART:
      return {
        ...state,
        cartItems: [],
        total: 0
      }
    case CartType.REMOVE_FROM_CART:
      return {
        ...state,
        cartItems: state.cartItems.filter((item) => item.product !== payload.product)
      }

    default:
      return state
  }
}

export default reducer
