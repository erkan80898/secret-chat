const express = require('express')
require('express-async-errors')
const app = express()
const cors = require('cors')
const config = require('./utils/config')
const routeLogger = require('./utils/routeLogger')
const loginRouter = require('./controllers/login')
const signupRouter = require('./controllers/signup')
const roomRouter = require('./controllers/room')

app.use(express.static('build'))

const logger = require('./utils/logger')
const mongoose = require('mongoose')

logger.info('connecting to', config.MONGODB_URI)

mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        logger.info('connected to MongoDB')
    })
    .catch((error) => {
        logger.error('error connection to MongoDB:', error.message)
    })

app.use(cors())
app.use(express.json())
app.use(routeLogger.requestLogger)

app.use('/login', loginRouter)
app.use('/signup', signupRouter)
app.use('/room', roomRouter)

app.use(routeLogger.unknownEndpoint)
app.use(routeLogger.errorHandler)

module.exports = app