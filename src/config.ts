export default {
  API_URL: `${window.location.origin}/api`
}
export const cardColors = [
  '#4472C4',
  '#941751',
  '#FF2F92',
  '#531B93',
  '#76D6FF',
  '#0096FF',
  '#5E5E5E',
  '#FF9300',
  '#009051',
  '#BF9000',
  '#C55A11',
  '#FFFF00'
]

export const isAdminEditMode = () => sessionStorage.getItem('ADMIN_EDIT_MODE') === 'true'
