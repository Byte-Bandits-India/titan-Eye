import { combineReducers, Reducer } from 'redux'
import templates from '../Screens/Templates/Reducer'
import API from './API/reducer'
import POSCart from './POSCart/reducer'
import times from './TimeReducer'
import { UserState } from './types'
import users from './UserReducer'

export default combineReducers({
  users: users as Reducer<UserState>,
  times,
  templates,
  POSCart,
  API
})
