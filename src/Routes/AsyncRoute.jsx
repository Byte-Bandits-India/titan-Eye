import { MessageContext, ModalContext, NotificationContext } from '@/Theme'
import React, { lazy } from 'react'
import { Helmet } from 'react-helmet'
import { connect } from 'react-redux'
import { validateAccess } from '../Util/Util'

const NotFound = lazy(() => import('@/Routes/NotFound'))

class AsyncRoute extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  render() {
    const { match, routeAccess, screen: Comp } = this.props
    const defaultMetaObject = {
      title: 'Electronic billing (fatoorah qr code) |Zatca guidelines in Saudi Arabia',
      description:
        'Electronic billing (fatoorah qr code) solution and service provider in Saudi Arabia: A step by step procedure using Zatca guidelines',
      keyword: 'Electronic Billing, Fatoorah qr code, Zatca guidelines, Saudi Arabia'
    }

    if (validateAccess(routeAccess || match.path, !routeAccess)) {
      return (
        <>
          <Helmet>
            <title>{defaultMetaObject.title}</title>
            <meta name="description" content={defaultMetaObject.description} />
            <meta name="keyword" content={defaultMetaObject.keyword} />
          </Helmet>
          <ModalContext.Consumer>
            {(modal) => (
              <MessageContext.Consumer>
                {(message) => (
                  <NotificationContext.Consumer>
                    {(notification) => (
                      <Comp {...this.props} modal={modal} message={message} notification={notification} />
                    )}
                  </NotificationContext.Consumer>
                )}
              </MessageContext.Consumer>
            )}
          </ModalContext.Consumer>
        </>
      )
    }

    return <NotFound />
  }
}

function mapStateToProps(state) {
  return {
    userInfo: state.users.userInfo,
    companyInfo: state.users.companyInfo,
    access: state.users.access
  }
}

export default connect(mapStateToProps)(AsyncRoute)
