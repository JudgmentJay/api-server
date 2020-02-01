const express = require('express')
const helmet = require('helmet')
const compression = require('compression')
const cors = require('cors-anywhere')

const bookmarksRouter = require('./routers/bookmarks')
const gamesRouter = require('./routers/games')

const server = express()

server.use(helmet())
server.use(compression())
server.use(express.json())

server.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', 'http://localhost:8080')
	res.header('Access-Control-Allow-Headers', 'Content-Type')
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')

	next()
})

const proxy = cors.createServer({
	originWhitelist: []
})

server.get('/proxy/:proxyUrl*', (req, res) => {
	req.url = req.url.replace('/proxy/', '/')
	proxy.emit('request', req, res)
})

server.use('/bookmarks', bookmarksRouter)
server.use('/games', gamesRouter)

const port = 3010

server.listen(port, () => {
	console.log(`Running API server on port ${port}`)
})
