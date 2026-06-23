import { logoutUser } from '@/Actions/UserAction'
import ChatButton from '@/Components/AccqrateAssistant/PreviewButton'
import { CloseOutlined, DownOutlined, MailOutlined, MenuOutlined } from '@ant-design/icons'
import { Col, Dropdown, Menu, Row, Space } from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import mainLogo from '../assets/images/logo-white.png'
import AutoCompleteBox from '../Components/AutoCompleteBox/AutoCompleteBox'
import ChangeLanguage from '../Components/ChangeLanguage/ChangeLanguage'
import Translate from '../Components/Translate/Translate'
import ServiceDeskModal from '../Screens/ServiceDesk/ServiceDeskModal'
import { avatarLetter, getImageUrl, validateAccess } from '../Util/Util'
import './Header.scss'
import LowInventoryChecker from './LowInventoryChecker'
import MENUS from './MenuJson'

const { SubMenu } = Menu

class Header extends React.Component {
  constructor() {
    super()
    this.state = {
      filterView: 'view',
      search: '',
      searchOptions: []
    }
  }

  componentDidMount() {
    const searchOptions = []

    const recursiveFn = (items) => {
      items.forEach((val) => {
        if (validateAccess(val.access?.map((item) => item.value)) && !val.notInMenu && !val.dontShow) {
          searchOptions.push({ label: val.label, value: val.value })
        }

        if (val.children) {
          recursiveFn(val.children)
        }
      })
    }

    recursiveFn(MENUS(this.props.companyInfo))
    this.setState({ searchOptions })
  }

  profileContent = () => {
    const { userInfo } = this.props

    return (
      <Menu className="profile-main-menu">
        <Menu.Item key="0">
          <Link to="/app/profile">
            <div className="accounting-user-profile">
              <div className="profile-name">
                <span>{avatarLetter(userInfo.name)}</span>
              </div>
              {/* <div className="profile-image">
                            <img src={profileImage} alt="Profile Image" />
                        </div> */}
              <div className="profile-text">
                <h3>{userInfo ? userInfo.name : ''}</h3>
                <span>
                  <Translate>View Profile</Translate>
                </span>
              </div>
            </div>
          </Link>
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item key="0.1">
          <a>
            <Translate>DNID</Translate>: {this.props.userInfo?.network}
          </a>
        </Menu.Item>
        <Menu.Item key="0.2">
          <a>
            <Translate>Company</Translate>: {this.props.userInfo?.company}
          </a>
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item key="1">
          <Link to="/app/profile">
            <i className="flaticon-user-1" /> <Translate>My Profile</Translate>
          </Link>
        </Menu.Item>
        {validateAccess('edit-company') && (
          <Menu.Item key="2">
            <Link to={`/app/edit-company/${this.props.userInfo && this.props.userInfo.company}`}>
              <i className="flaticon-office-building" /> <Translate>Company Profile</Translate>
            </Link>
          </Menu.Item>
        )}
        <Menu.Item key="3">
          <Link to="/app/manage-company">
            <i className="flaticon-office-building" /> <Translate>Manage Company</Translate>
          </Link>
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item key="4">
          <Link to="/app/change-password">
            <i className="flaticon-padlock" /> <Translate>Change Password</Translate>
          </Link>
        </Menu.Item>
        <Menu.Item key="5">
          <Link to="/app/multi-factor-authentication">
            <i className="flaticon-shield" /> <Translate>Multi-Factor Authentication</Translate>
          </Link>
        </Menu.Item>

        <Menu.Divider />
        <Menu.Item key="6">
          <a onClick={() => this.onRedirect('/login')}>
            <i className="flaticon-power-button" /> <Translate>Logout</Translate>
          </a>
        </Menu.Item>
      </Menu>
    )
  }

  onRedirect = (path) => {
    if (path === '/login') {
      this.props.dispatch(logoutUser()).then((data) => {
        if (data) {
          localStorage.removeItem('SESSION_TOKEN')
          this.props.history.push(path)
        }
      })
    } else {
      this.props.history.push(path)
      const x = document.getElementById('accounting-sider-menu')

      if (x) {
        x.style.display = 'none'
        this.setState({ filterView: 'view' })
      }
    }
  }

  // responsive filter starts
  accountingSideMenu = () => {
    const x = document.getElementById('accounting-sider-menu')
    const y = document.getElementById('mobile-sider-menu')

    if (x.style.display === 'block') {
      x.style.display = 'none'
      this.setState({ filterView: 'view' })
    } else {
      x.style.display = 'block'
      this.setState({ filterView: 'close' })

      if (y) {
        y.style.display = 'none'
      }
    }
  }
  // responsive filter ends

  generateMenuItem = (item, ind) => {
    if (validateAccess(item.access?.map((item) => item.value)) && !item.notInMenu && !item.dontShow) {
      return (
        <Menu.Item key={`${item.label}-${ind}`}>
          <a
            style={{
              paddingLeft: 5,
              paddingRight: 5,
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis'
            }}
            onClick={() => this.onRedirect(item.value)}>
            <Space>
              {item?.icon && <i className={item?.icon} />}
              <Translate>{item.label}</Translate>
            </Space>
          </a>
        </Menu.Item>
      )
    }

    return false
  }

  generateMenuGroup = (group, ind) => {
    const groupMenu = []
    group.children.forEach((item, ind) => {
      const list = this.generateMenuItem(item, ind)

      if (list) {
        groupMenu.push(list)
      }
    })

    if (groupMenu.length > 0) {
      return (
        <Menu.ItemGroup title={<Translate>{group.label}</Translate>} key={`${group.label}-${ind}`}>
          {groupMenu}
        </Menu.ItemGroup>
      )
    }

    return false
  }

  generateSubMenu = (sub, ind) => {
    const submenu = []
    sub.children.forEach((item) => {
      if (item.type === 'group') {
        const groupMenu = this.generateMenuGroup(item, ind)

        if (groupMenu) {
          submenu.push(groupMenu)
        }
      } else {
        const list = this.generateMenuItem(item, ind)

        if (list) {
          submenu.push(list)
        }
      }
    })

    if (submenu.length > 0) {
      return (
        <SubMenu title={sub.label} key={`${sub.label}-${ind}`}>
          {submenu}
        </SubMenu>
      )
    }

    return false
  }

  generateMenu = (menuItems, className) => {
    const menuArr = []
    menuItems.forEach((item, ind) => {
      if (item.type === 'submenu') {
        const submenu = this.generateSubMenu(item, ind)

        if (submenu) {
          menuArr.push(submenu)
        }
      } else if (item.type === 'group') {
        const groupMenu = this.generateMenuGroup(item, ind)

        if (groupMenu) {
          menuArr.push(groupMenu)
        }
      } else {
        const list = this.generateMenuItem(item, ind)

        if (list) {
          menuArr.push(list)
        }
      }
    })

    if (menuArr.length > 0) {
      return <Menu className={className || ''}>{menuArr}</Menu>
    }

    return false
  }

  renderMenu = () =>
    MENUS(this.props.companyInfo).map((menu, ind) => {
      if (menu.children) {
        const menuItem = this.generateMenu(menu.children, menu.className)

        if (menuItem) {
          return (
            <Menu.Item key={`${menu.label}-${ind}`}>
              {menu.children ? (
                <Dropdown overlay={menuItem} trigger={['click']} arrow>
                  <a className="ant-dropdown-link">
                    <Space>
                      {menu?.icon && <i className={menu?.icon} />}
                      <Translate>{menu.label}</Translate> <DownOutlined />
                    </Space>
                  </a>
                </Dropdown>
              ) : (
                <a className="ant-dropdown-link">
                  <Translate>{menu.label}</Translate>
                </a>
              )}
            </Menu.Item>
          )
        }

        return null
      }

      return this.generateMenuItem(menu)
    })

  renderResponsiveMenu = () =>
    MENUS(this.props.companyInfo).map((menu, ind) => {
      if (menu.children) {
        const menuItem = this.generateMenu(menu.children)

        if (menuItem) {
          return (
            <SubMenu key={`${menu.label}-${ind}`} title={menu.label}>
              <Translate>{menuItem}</Translate>
            </SubMenu>
          )
        }

        return null
      }

      return this.generateMenuItem(menu)
    })

  filterOption = (inputValue, option) => option.label.toUpperCase().indexOf(inputValue.toUpperCase()) >= 0

  render() {
    const { userInfo, companyInfo } = this.props

    return (
      <div>
        {/* responsive main menu starts */}
        <div className="accounting-sider-menu" id="accounting-sider-menu">
          <Menu mode="inline">{this.renderResponsiveMenu()}</Menu>
        </div>
        {/* responsive main menu ends */}

        <div className="main-header">
          <Row justify="center">
            <Col xs={{ span: 9 }} sm={{ span: 9 }} md={{ span: 6 }} lg={{ span: 3 }}>
              <div
                className="logo"
                style={{
                  background: 'transparent'
                }}>
                <div className="main-responsive-menu">
                  {this.state.filterView === 'view' ? (
                    <MenuOutlined
                      onClick={this.accountingSideMenu}
                      style={{ color: '#fff', fontSize: '25px' }}
                    />
                  ) : (
                    <CloseOutlined
                      onClick={this.accountingSideMenu}
                      style={{ color: '#fff', fontSize: '25px' }}
                    />
                  )}
                </div>
                <Link to="/app/dashboard">
                  {companyInfo ? (
                    companyInfo.logo && companyInfo.logo !== '' ? (
                      <img src={getImageUrl(companyInfo.logo)} alt="Accounting software" />
                    ) : (
                      <h2 title={companyInfo.name}>{companyInfo.name}</h2>
                    )
                  ) : (
                    <img
                      src={mainLogo}
                      alt="Accounting software"
                      style={{ width: '100%', height: 45, padding: 5 }}
                    />
                  )}
                </Link>
              </div>
            </Col>

            <Col xs={{ span: 14 }} sm={{ span: 14 }} md={{ span: 18 }} lg={{ span: 21 }}>
              <div className="container-menu">
                <Row>
                  <Col
                    xs={{ span: 3 }}
                    sm={{ span: 3 }}
                    md={{ span: 8 }}
                    lg={{ span: 17 }}
                    xxl={{ span: 17 }}
                    className="default-menu-desktop">
                    <div className="navigation">
                      <Menu mode="horizontal">{this.renderMenu()}</Menu>
                    </div>
                  </Col>

                  <Col xs={{ span: 0 }} sm={{ span: 0 }} md={{ span: 7 }} lg={{ span: 3 }} xxl={{ span: 3 }}>
                    <div className="search">
                      <AutoCompleteBox
                        id="Search"
                        placeholder="Search here.."
                        value={this.state.search}
                        options={this.state.search !== '' ? this.state.searchOptions : []}
                        onChangeText={(value) => this.setState({ search: value })}
                        onSelect={(value) => {
                          this.props.history.push(value)
                          this.setState({ search: '' })
                        }}
                        isSubmit={this.state.isSubmit}
                        disabled={this.props.disableFields}
                        filterOption={this.filterOption}
                      />
                    </div>
                  </Col>

                  <Col
                    xs={{ span: 24 }}
                    sm={{ span: 24 }}
                    md={{ span: 9 }}
                    lg={{ span: 4 }}
                    xxl={{ span: 4 }}>
                    <div className="right-profile-menu">
                      <ul>
                        {validateAccess('stock-below-reorder-level') && <LowInventoryChecker />}
                        <li style={{ display: 'none' }}>
                          <ChangeLanguage noLabel />
                        </li>
                        <li>
                          <ChatButton />
                        </li>
                        <li>
                          <ServiceDeskModal />
                        </li>
                        <li>
                          <Link to="/app/inbox" className="ant-dropdown-link settings">
                            <MailOutlined />
                          </Link>
                        </li>
                        {/* <li>
                          <Link to="/app/notifications" className="notification">
                            <i className="flaticon-notification" />
                            <span>3</span>
                          </Link>
                        </li> */}
                        <li>
                          <Dropdown overlay={this.profileContent()} trigger={['click']} arrow>
                            <a className="ant-dropdown-link main-profile">
                              <div className="profile-name">
                                <span>{avatarLetter(userInfo.name)}</span>
                              </div>
                              {/* <div className="profile-image">
                                                                <img src={profileImage} alt="Profile Image" />
                                                            </div> */}
                            </a>
                          </Dropdown>
                        </li>
                      </ul>
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </div>
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    userInfo: state.users.userInfo,
    companyInfo: state.users.companyInfo,
    access: state.users.access
  }
}

export default connect(mapStateToProps)(Header)
