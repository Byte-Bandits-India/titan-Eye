import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { connect } from 'react-redux'
import { useHistory } from 'react-router-dom'

function RouteWrapper(props) {
  const history = useHistory()

  const { screen: Comp, metaObj } = props
  const defaultMetaObject = {
    title: metaObj
      ? metaObj.title
      : 'Electronic billing (fatoorah qr code) |Zatca guidelines in Saudi Arabia',
    description: metaObj
      ? metaObj.description
      : 'Electronic billing (fatoorah qr code) solution and service provider in Saudi Arabia: A step by step procedure using Zatca guidelines',
    keyword: metaObj
      ? metaObj.keyword
      : 'Electronic Billing, Fatoorah qr code, Zatca guidelines, Saudi Arabia'
  }

  useEffect(() => {
    const unRegister = history.listen(() => {
      const appView = document.getElementById('app-view')

      if (appView) {
        appView.scrollIntoView()
      }
    })

    return () => {
      unRegister()
    }
  }, [])

  return (
    <>
      <span id="app-view" />
      <Helmet>
        <title>{defaultMetaObject.title}</title>
        <meta name="description" content={defaultMetaObject.description} />
        <meta name="keyword" content={defaultMetaObject.keyword} />
      </Helmet>
      <Comp {...props} />
    </>
  )
}

function mapStateToProps(state) {
  return {
    lang: state.users.lang
  }
}

export default connect(mapStateToProps)(RouteWrapper)
