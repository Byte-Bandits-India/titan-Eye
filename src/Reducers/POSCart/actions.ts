import { CartType } from '../../Actions/ActionType'
import ConfirmationBox from '../../Components/ConfirmationBox/ConfirmationBox'
import store from '../../store/store'
import { ICart } from './interfaces'

export const addPOSCartItem = (item: ICart) => {
  store.dispatch({ type: CartType.ADD_TO_CART, payload: item })
}

export const removePOSCartItem = (item: ICart) => {
  store.dispatch({ type: CartType.REMOVE_FROM_CART, payload: item })
}

export const emptyPOSCart = (showAlert = true) => {
  if (showAlert) {
    ConfirmationBox({
      title: 'Alert',
      description: 'Are you sure want empty Cart?',
      acceptText: 'Ok',
      cancelText: 'Cancel',
      acceptFn: () => store.dispatch({ type: CartType.EMPTY_CART })
    })
  } else {
    store.dispatch({ type: CartType.EMPTY_CART })
  }
}
