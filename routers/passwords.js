const express = require('express')
const mongoose = require('mongoose')
const cache = require('memory-cache')

const Password = require('../models/password')

const passwordsRouter = express.Router()

const cacheKey = 'passwords'

passwordsRouter.get('/', (req, res) => {
	const cachedData = cache.get(cacheKey)

	if (cachedData) {
		res.json(cachedData)
	} else {
		const user = process.env.MONGODB_USER
		const pass = process.env.MONGODB_PASS

		const db = `mongodb+srv://${user}:${pass}@passwords.tznlx.mongodb.net/stuff?retryWrites=true&w=majority`

		mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
			.then(() => console.log('Connected to database'))
			.catch((error) => {
				console.log(`Error connecting to database: ${error}`)
				res.status(403).send(error)
			})

		Password.find({}, { '_id': 0 })
			.then((result) => {
				cache.put(cacheKey, result)

				mongoose.disconnect(() => console.log('Successfully fetched data. Disconnecting...'))

				res.send(result)
			})
			.catch((error) => res.status(400).send(error))
	}
})

module.exports = passwordsRouter
