const express = require('express')
const fetch = require('node-fetch')
const cache = require('memory-cache')

const weatherRouter = express.Router()

weatherRouter.get('/:filters', (req, res) => {
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

module.exports = weatherRouter
