const express = require('express')
const cors = require('cors')
const connectDB = require('./src/database')

const authRoutes = require('./src/routes/auth')

const app = express()
const PORT = process.env.PORT || 3000


connectDB()

app.use(express.json())
app.use(cors())

app.use('/api/auth', authRoutes)

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})