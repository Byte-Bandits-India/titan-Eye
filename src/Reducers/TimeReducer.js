import moment from 'moment'
import { UserType } from '../Actions/ActionType'

const getWeek = () => {
  const CURRENT_DATE = moment()
  const selectedStartWeek = moment(CURRENT_DATE).startOf('week').startOf('day')
  const selectedEndWeek = moment(CURRENT_DATE).endOf('week')
  const selectedStartMonth = moment(CURRENT_DATE).startOf('month').startOf('day')
  const selectedEndMonth = moment(CURRENT_DATE).endOf('month')

  const START_WEEK = selectedStartWeek > selectedStartMonth ? selectedStartWeek : selectedStartMonth
  const END_WEEK = selectedEndWeek < selectedEndMonth ? selectedEndWeek : selectedEndMonth

  return { START_WEEK, END_WEEK, CURRENT_DATE }
}

const { START_WEEK, END_WEEK, CURRENT_DATE } = getWeek()

const initialState = {
  startWeek: START_WEEK,
  endWeek: END_WEEK,
  timeEntries: [],
  selectedDate: CURRENT_DATE.format('YYYY-MM-DD'),
  weekEntry: false,

  weekEntries: [],
  approvedWeekEntries: [],
  rejectedWeekEntries: []
}

const setData = (state, action) => {
  const newState = {}
  Object.assign(newState, state, action.payload)

  return newState
}

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case UserType.SET_TIME_DATA: {
      return setData(state, action)
    }

    default: {
      return state
    }
  }
}
