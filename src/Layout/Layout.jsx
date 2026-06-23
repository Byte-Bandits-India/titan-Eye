import { Layout } from 'antd'
import React, { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import HeaderLoader from '../Components/LoaderBox/HeaderLoader'
import './Header.scss'

const HeaderNav = HeaderLoader(() => import('./Header'))

const { Header, Content } = Layout

export default function Layouts(props) {
  const history = useHistory()

  useEffect(() => {
    const currentUser = localStorage.getItem('SESSION_TOKEN')

    if (!currentUser) {
      history.push('/')
    }
  }, [])

  return (
    <Layout className="site-layout">
      <Header className="site-layout-background fixed-header" id="fixed-header" style={{ padding: 0 }}>
        <HeaderNav {...props} />
      </Header>
      <Content className="site-layout-background default-spacing">{props.children}</Content>
    </Layout>
  )
}
