import LoaderBox from '@/Components/LoaderBox/LoaderBox'
import { lazy, memo, Suspense } from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'

const NotFound = lazy(() => import('./NotFound'))
const RouteWrapper = lazy(() => import('./RouteWrapper'))

const routes = [
  { path: '/', screen: lazy(() => import('../Screens/Login/Login')) },
  { path: '/login', screen: lazy(() => import('../Screens/Login/Login')) },
  { path: '/register', screen: lazy(() => import('../Screens/Register/Register')) },
  { path: '/forgot-password', screen: lazy(() => import('../Screens/ForgotPassword/ForgotPassword')) },
  {
    path: '/sales-quotations/:token',
    screen: lazy(() => import('../Screens/SalesManagement/SalesQuotations/SalesQuotationView'))
  },
  {
    path: '/customer-onboarding',
    screen: lazy(() => import('../Screens/CustomerOnboarding/Registration/Registration'))
  },
  { path: '/qr-info/:type/:id', screen: lazy(() => import('../Screens/QrInfo/QrInfo')) },
  { path: '/open-invoice', screen: lazy(() => import('../Screens/OpenInvoice/OpenInvoiceForm')) },
  { path: '/open-invoice/:id', screen: lazy(() => import('../Screens/OpenInvoice/OpenInvoiceView')) },
  { path: '/edit-open-invoice/:id', screen: lazy(() => import('../Screens/OpenInvoice/OpenInvoiceForm')) },
  { path: '/apply-job/:id', screen: lazy(() => import('../Screens/HRMS/ApplyJob/ApplyJob')) },
  {
    path: '/onboarding-candidates/:token',
    screen: lazy(() => import('../Screens/HRMS/EmployeeOnboardings/EmployeeOnboardingForm'))
  },
  { path: '/campaigns/:id', screen: lazy(() => import('../Screens/LeadManagement/Campaigns/CampaignView')) }
]

function Routes() {
  return (
    <Suspense fallback={<LoaderBox loader />}>
      <Switch>
        {routes.map(({ path, ...restProps }) => (
          <Route
            key={path}
            exact
            path={path}
            render={(props) => <RouteWrapper {...props} {...restProps} />}
          />
        ))}
        <Redirect from="/app" to="/login" />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  )
}

export default memo(Routes)
