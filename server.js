const express = require('express')
const helmet = require('helmet')
const compression = require('compression')
const cors = require('cors-anywhere')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const cache = require('memory-cache')

dotenv.config()

const bookmarksRouter = require('./routers/bookmarks')
const gamesRouter = require('./routers/games')

const server = express()

server.use(helmet())
server.use(compression())
server.use(express.json())

const proxy = cors.createServer({
	originWhitelist: [],
	requireHeader: ['origin', 'x-requested-with']
})

server.get('/proxy/:proxyUrl*', (req, res) => {
	req.url = req.url.replace('/proxy/', '/')
	proxy.emit('request', req, res)
})

server.get('/weather/:filters', (req, res) => {
	const apiKey = process.env.DARKSKY_API_KEY
	const cacheKey = 'weather'

	const cachedData = cache.get(cacheKey)

	if (cachedData) {
		res.json(cachedData)
	} else {
		const filters = req.params.filters.split('_')
		const latitude = filters[0]
		const longitude = filters[1]
		const exclusions = filters[2]

		fetch(`http://localhost:3010/proxy/https://api.darksky.net/forecast/${apiKey}/${latitude},${longitude}?exclude=${exclusions}`, {
			headers: {
				'x-requested-with': 'XMLHttpRequest'
			}
		})
			.then((response) => response.json())
			.then((weather) => {
				const weatherData = {
					temperature: weather.currently.temperature,
					icon: weather.currently.icon,
					sunrise: weather.daily.data[0].sunriseTime,
					sunset: weather.daily.data[0].sunsetTime
				}

				cache.put(cacheKey, weatherData, 600*1000)

				res.json(weatherData)
			})
			.catch((error) => {
				res.status(400).send(error)
			})
	}
})

server.use('/bookmarks', bookmarksRouter)
server.use('/games', gamesRouter)

const port = 3010

server.listen(port, () => {
	console.log(`Running API server on port ${port}`)
})
