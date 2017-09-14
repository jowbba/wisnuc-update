const express = require('express')
const log4js = require('log4js')
const handler = require('./lib/webhook')

const app = express()

app.use((req, res, next) => {
	console.log('...')
	handler(req, res, err => {
		res.statusCode = 404
		res.end('no such location')
	})
})

module.exports = app
