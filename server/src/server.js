require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')
const app = require('./app')

const port = process.env.PORT || 4000
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is required. Copy .env.example to .env and configure MongoDB Atlas.')
  process.exit(1)
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.info('Connected to MongoDB')
    app.listen(port, () => console.info(`MacroZone API listening on port ${port}`))
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message)
    process.exit(1)
  })
