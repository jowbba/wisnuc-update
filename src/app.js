const express = require('express')

const log4js = require('log4js')
// const Logger = require('./utils/logger').Logger('app')

const app = express()

// catch 404 and forward to error handler
app.use((req, res, next) => {
	let err = new Error('Not Found11')
	err.status = 404
	res.status(err.status).json(err.message)
	next()
})

module.exports = app
