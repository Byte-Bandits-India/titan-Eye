import { history } from '@/Util/history'
import axios from 'axios'
import { lazy, useEffect, useState } from 'react'
import { connect, useDispatch } from 'react-redux'
import { Route, Router, Switch } from 'react-router-dom'

const RouteWrapper = lazy(() => import('./RouteWrapper'))
const InnerRoutes = lazy(() => import('./InnerRoutes'))
const PublicRoutes = lazy(() => import('./PublicRoutes'))

function Routes({ userInfo, language }) {
  const [init, setInit] = useState(false)
  const dispatch = useDispatch()

  useEffect(() => {
    axios.get('/api/translations/list', { params: { language } }).then(({ data }) => {
      if (data?.result) {
        dispatch({ type: 'SET_TRANSLATION', payload: { translations: data?.result, language } })
        setInit(true)
      } else {
        setInit(true)
      }
    })
  }, [])

  const currentUser = localStorage.getItem('SESSION_TOKEN')

  return (
    <Router history={history}>
      {init && (
        <Switch>
          {(currentUser || userInfo) && (
            <Route path="/app" render={(props) => <RouteWrapper {...props} screen={InnerRoutes} />} />
          )}
          <Route path="/" component={PublicRoutes} />
        </Switch>
      )}
    </Router>
  )
}

function mapStateToProps(state) {
  return {
    userInfo: state.users.userInfo,
    language: state.users.language,
    translations: state.users.translations
  }
}

export default connect(mapStateToProps)(Routes)
