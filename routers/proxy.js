const express = require('express')
const cors = require('cors-anywhere')

const proxyRouter = express.Router()

const proxy = cors.createServer({
	originWhitelist: [],
	requireHeader: ['origin', 'x-requested-with']
})

proxyRouter.get('/:proxyUrl*', (req, res) => {
	req.url = req.url.replace('/proxy/', '/')
	proxy.emit('request', req, res)
})

module.exports = proxyRouter
