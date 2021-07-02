const fs = require('fs')
const parse = require('csv-parse')
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
			.then(() => {
				Password.find({}, { '_id': 0 })
					.then((result) => {
						cache.put(cacheKey, result)

						mongoose.disconnect()

						res.send(result)
					})
					.catch((error) => {
						console.error(`Error retrieving passwords: ${error.message}`)

						res.status(500).send('Error retrieving passwords')
					})
			})
			.catch((error) => {
				console.error(`Error connecting to database: ${error.message}`)

				res.status(401).send('Error connecting to database')
			})
	}
})

passwordsRouter.get('/upload', (req, res) => {
	const data = []

	const parser = parse({columns: true}, (err, data) => {
		console.log(data)
	})

	fs.createReadStream('./data/passwords.csv')
		.pipe(parser)
})

module.exports = passwordsRouter
