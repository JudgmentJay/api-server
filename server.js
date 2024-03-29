const express = require('express')
const helmet = require('helmet')
const compression = require('compression')
const dotenv = require('dotenv')

dotenv.config()

const bookmarksRouter = require('./routers/bookmarks')
const flickrRouter = require('./routers/flickr')
const gamesRouter = require('./routers/games')
const proxyRouter = require('./routers/proxy')
const weatherRouter = require('./routers/weather')

const server = express()

server.use(helmet())
server.use(compression())
server.use(express.json())

server.use('/bookmarks', bookmarksRouter)
server.use('/flickr', flickrRouter)
server.use('/games', gamesRouter)
server.use('/proxy', proxyRouter)
server.use('/weather', weatherRouter)

const port = 3000

server.listen(port, () => {
	console.log(`Running API server on port ${port}`)
})
