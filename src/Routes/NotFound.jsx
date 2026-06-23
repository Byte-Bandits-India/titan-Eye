import { Link } from 'react-router-dom'
import invoice from '../assets/images/loader.svg'
import Translate from '../Components/Translate/Translate'

const NotFound = ({ title = 'Page Not Found', linkText = 'Go Back to Home', link = '/app/dashboard' }) => (
  <div className="page-not-found">
    <img src={invoice} alt="Nothing found" />
    <h1>
      <Translate>{title}</Translate>
    </h1>
    <div>
      <Link className="btn-glow primary" to={link}>
        <i className="flaticon-left-arrow-6" /> <Translate>{linkText}</Translate>
      </Link>
    </div>
  </div>
)

export default NotFound
