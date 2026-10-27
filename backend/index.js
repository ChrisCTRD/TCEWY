require('dotenv').config()
const http = require('http')
const express = require('express')
const cors = require('cors')
const connectDB = require('./src/database')
const { initSocket } = require('./src/socket')
require('./src/middleware/auth')

const authRoutes = require('./src/routes/auth')
const apiRoutes = require('./src/routes/api')
const portraitRoutes = require('./src/routes/portrait')
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3000

// Front origin(s). Comma-separated list is accepted: CLIENT_ORIGIN=http://localhost:5173,https://meusite.com
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(express.json())
app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }))

app.use('/api/auth', authRoutes)
app.use('/api/portraits', portraitRoutes)
app.use('/api', apiRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

// socket.io needs the raw http server, so we no longer call app.listen directly.
const server = http.createServer(app)
initSocket(server, { origins: CLIENT_ORIGINS })

const start = async () => {
  await connectDB()
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start()
