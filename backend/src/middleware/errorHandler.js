const { AppError } = require('../utils/AppError')

// Same body the project already used for unknown routes.
const notFoundHandler = (req, res) => {
  res.status(404).json({ message: 'Route not found' })
}

// Express 5 forwards rejected promises from async handlers here, so controllers need no try/catch.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err)

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } })
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } })
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } })
  }

  console.error(err)
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
}

module.exports = { notFoundHandler, errorHandler }
