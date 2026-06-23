import { setDefaultTimeZone } from '@/Util/Util'
import moment from 'moment'
import { tz } from 'moment-timezone'
import { UserType } from '../Actions/ActionType'

let timer

const initialState = {
  userInfo: false,
  adminUser: false,
  companyInfo: false,
  departmentInfo: false,
  access: [],
  language: 'en',
  translations: {},
  masterOptions: [],
  projects: []
}

const getUser = (state, action) => {
  const newState = {}

  Object.assign(newState, state, {
    userInfo: action.payload,
    companyInfo: action.payload.companyData,
    departmentInfo:
      action.payload.departmentData && action.payload.departmentData.id
        ? action.payload.departmentData
        : false
  })

  if (action.payload?.companyData?.timeZone) {
    setDefaultTimeZone(action.payload.companyData?.timeZone)
  }

  return newState
}

const setData = (state, action) => {
  const newState = {}
  Object.assign(newState, state, action.payload)

  return newState
}

const setTimerCount = (state, action) => {
  if (action.payload) {
    const difference = moment(tz('asia/kolkata')).diff(
      moment(tz(state.userInfo.timeEntryStartsAt, 'asia/kolkata')),
      'millisecond'
    )

    const onRenderTime = (difference) => {
      let seconds = Math.floor(difference / 1000)
      let minutes = Math.floor(seconds / 60)
      let hours = Math.floor(minutes / 60)
      hours %= 24
      minutes %= 60
      seconds %= 60
      const hoursData = `${hours}`.padStart(2, '0')
      const minutesData = `${minutes}`.padStart(2, '0')
      const secondsData = `${seconds}`.padStart(2, '0')
      const time = `${hoursData}:${minutesData}:${secondsData}`

      if (document.getElementById('timer_count')) {
        document.getElementById('timer_count').innerHTML = time
        // document.getElementById('stop-timer').style.display = 'flex';
        // document.getElementById('time-count').innerHTML = `${time} - ${action.payload.projectData.name}`;
      }

      if (document.title) {
        document.title = `${time} - ${action.payload.projectData.name}`
      }

      if (timer) {
        clearInterval(timer)
      }

      timer = setTimeout(() => {
        const diff = moment(tz('asia/kolkata').format('YYYY-MM-DD HH:mm:ss')).diff(
          moment(state.userInfo.timeEntryStartsAt),
          'millisecond'
        )
        onRenderTime(diff + action.payload.totalMinutes * 60000)
      }, 1000)
    }

    onRenderTime(difference + action.payload.totalMinutes * 60000)
  } else {
    clearInterval(timer)

    if (document.title) {
      document.title = 'Online Accounting Solutions - Streamline Billing & Invoicing'
    }
    // if( document.getElementById('stop-timer')){
    //   document.getElementById('stop-timer').style.display = 'none';
    // }
  }

  const newState = {}
  Object.assign(newState, state)

  return newState
}

const setTranslation = (state, action) => {
  const newState = {}
  const translations = {}
  action.payload?.translations.forEach((v) => {
    translations[v.en] = v
  })
  Object.assign(newState, state, { translations, language: action.payload.language })

  return newState
}

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case UserType.GET_USER: {
      return getUser(state, action)
    }

    case UserType.SET_USER_REDUCER: {
      return setData(state, action)
    }

    case UserType.SET_TIMER_COUNT: {
      return setTimerCount(state, action)
    }

    case UserType.SET_TRANSLATION: {
      return setTranslation(state, action)
    }

    default: {
      return state
    }
  }
}
