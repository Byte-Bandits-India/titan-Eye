import axios from 'axios'

export default function setAuthorizationToken(token?: string) {
  if (token) {
    localStorage.setItem('SESSION_TOKEN', token)
    axios.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    localStorage.removeItem('SESSION_TOKEN')
    delete axios.defaults.headers.common.Authorization
  }
}
