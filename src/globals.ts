import moment from 'moment'
import './Util/YupMethod'

moment.updateLocale('en', {
  week: {
    dow: 1
  }
})

String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1)
}
