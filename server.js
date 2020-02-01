const express = require('express')
const helmet = require('helmet')
const compression = require('compression')

const bookmarksRouter = require('./routers/bookmarks')
const gamesRouter = require('./routers/games')

const server = express()

server.use(helmet())
server.use(compression())
server.use(express.json())

server.use('/bookmarks', bookmarksRouter)
server.use('/games', gamesRouter)

const PORT = 3010

server.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`)
})
