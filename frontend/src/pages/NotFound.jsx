import './NotFound.css'

function NotFound() {
  return (
    <div className="not-found">
      <img src="/noise404.webp" alt="Noise" className="noise-img" />
      <h1 className="error-code">404</h1>
      <h2 className="error-title">A Noise!?</h2>
      <p className="error-subtitle">Looks like this page was erased from the UG.</p>
      <a href="/" className="bounce-btn-wrapper">
        <img src="/escape_top.svg" alt="" className="escape-img" />
        <button className="bounce-btn">Gotta Bounce!</button>
        <img src="/escape_bottom.svg" alt="" className="escape-img" />
      </a>
    </div>
  )
}

export default NotFound