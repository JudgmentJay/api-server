const express = require('express')
const bookmarksRouter = require('./routers/bookmarks')

const server = express()

server.use(express.json())

server.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*")
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
	next()
})

server.use('/bookmarks', bookmarksRouter)

const PORT = 3001

server.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`)
})