const express = require('express')
const cors = require('cors')
const requestLogger = require('./middleware/requestLogger')
const mealRoutes = require('./routes/meals')
const targetRoutes = require('./routes/targets')

const app = express()
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
]

app.use(requestLogger)
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || developmentOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS`))
  },
}))
app.use(express.json({ limit: '1mb' }))
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/meals', mealRoutes)
app.use('/api/targets', targetRoutes)
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }))
app.use((error, _req, res, _next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(error.errors).map((item) => item.message).join('; ') })
  }
  if (error.name === 'CastError' || error.code === 11000) {
    return res.status(400).json({ message: error.code === 11000 ? 'A record with that value already exists' : 'Invalid record ID' })
  }
  const status = error.status || 500
  if (status >= 500) console.error(error)
  return res.status(status).json({ message: error.message || 'Internal server error' })
})

module.exports = app
