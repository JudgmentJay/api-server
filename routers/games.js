const express = require('express')
const sqlite3 = require('sqlite3')
const cache = require('memory-cache')

const gamesRouter = express.Router()

const cacheKey = 'games'

const password = process.env.SERVER_PW

const numberFields = [
	'gameId',
	'score',
	'playing',
	'hoursPlayed',
	'timesCompleted'
]

const generateQuery = (type, data) => {
	const dataEntries = Object.entries(data)

	const queryParams = []

	dataEntries.forEach((dataItem) => {
		if (typeof dataItem[1] !== 'undefined' && dataItem[1] !== '') {
			if (dataItem[0] === 'title') {
				if (dataItem[1].includes('\'')) {
					dataItem[1] = dataItem[1].replace(/'/g, '\'\'')
				}
			}

			queryParams.push({
				field: dataItem[0],
				value: numberFields.includes[dataItem[0]] ? parseInt(dataItem[1]) : dataItem[1]
			})
		}
	})

	if (type === 'insert') {
		const fields = queryParams.map((param) => param.field).join(', ')
		const values = queryParams.map((param) => {
			return typeof param.value === 'string' ? `'${param.value}'` : param.value
		}).join(', ')

		return {fields, values}
	} else {
		const setString = queryParams.map((param) => {
			return `${param.field} = ${typeof param.value === 'string' ? `'${param.value}'` : param.value }`
		}).join(', ')

		return setString
	}
}

gamesRouter.get('/all', (req, res) => {
	const cachedData = cache.get(cacheKey)

	if (cachedData) {
		res.json(cachedData)
	} else {
		const db = new sqlite3.Database('./games.sqlite')

		db.all(`SELECT rowid AS id, * FROM playthroughs ORDER BY dateFinished`, (error, playthroughs) => {
			if (error) {
				res.status(404).send(`Error retrieving playthroughs: ${error}`)
			} else {
				playthroughs = playthroughs.sort((playthroughA, playthroughB) => new Date(playthroughB.dateStarted) - new Date(playthroughA.dateStarted))

				db.all(`SELECT rowid AS id, * FROM games ORDER BY LOWER(REPLACE(title, 'The ', ''))`, (error, games) => {
					if (error) {
						res.status(404).send(`Error retrieving games: ${error}`)
					} else {
						games.forEach((game) => {
							const gamePlaythroughs = playthroughs.filter((playthrough) => {
								return playthrough.gameId === game.id
							})

							game.playthroughs = gamePlaythroughs
						})

						const dataToSend = {
							games,
							playthroughs
						}

						cache.put(cacheKey, dataToSend)

						res.json(dataToSend)
					}
				})
			}
		})

		db.close()
	}
})

gamesRouter.post('/add', (req, res) => {
	if (req.body.password !== password) {
		res.status(401).send('Invalid password')
	} else {
		const gameData = {
			title: req.body.title,
			releaseDate: req.body.releaseDate,
			score: req.body.score,
			playing: req.body.playing
		}

		const query = generateQuery('insert', gameData)

		const db = new sqlite3.Database('./games.sqlite')

		db.run(`INSERT INTO games (${query.fields}) VALUES (${query.values})`, function(error) {
			if (error) {
				res.status(500).send(`Error adding new game: ${error}`)
			} else {
				if (req.body.dateStarted) {
					const gameId = this.lastID

					const playthroughData = {
						gameId,
						dateStarted: req.body.dateStarted,
						dateFinished: req.body.dateFinished,
						hoursPlayed: req.body.hoursPlayed,
						timesCompleted: req.body.timesCompleted,
						platform: req.body.platform
					}

					const query = generateQuery('insert', playthroughData)

					db.run(`INSERT INTO playthroughs (${query.fields}) VALUES (${query.values})`, function(error) {
						if (error) {
							res.status(500).send(`Error adding new game playthrough: ${error}`)
						} else {
							cache.del(cacheKey)

							res.send({})
						}
					})
				} else {
					cache.del(cacheKey)

					res.send({})
				}
			}
		})

		db.close()
	}
})

gamesRouter.put('/edit/:gameId', (req, res) => {
	if (req.body.password !== password) {
		res.status(401).send('Invalid password')
	} else {
		const db = new sqlite3.Database('./games.sqlite')

		const gameData = {
			title: req.body.title,
			releaseDate: req.body.releaseDate,
			score: req.body.score
		}

		const setString = generateQuery('update', gameData)

		db.run(`UPDATE games SET ${setString} WHERE rowid = '${req.params.gameId}'`, (error) => {
			if (error) {
				res.status(500).send(`Error updating game: ${error}`)
			} else {
				cache.del(cacheKey)

				res.send({})
			}
		})

		db.close()
	}
})

gamesRouter.delete('/delete/:gameId', (req, res) => {
	if (req.body.password !== password) {
		res.status(401).send('Invalid password')
	} else {
		const db = new sqlite3.Database('./games.sqlite')

		db.run(`DELETE FROM games WHERE rowid = '${req.params.gameId}'`, (error) => {
			if (error) {
				res.status(500).send(`Error deleting game: ${error}`)
			} else {
				cache.del(cacheKey)

				res.send({})
			}
		})

		db.close()
	}
})

gamesRouter.post('/playthroughs/start/:gameId', (req, res) => {
	if (req.body.password !== password) {
		res.status(401).send('Invalid password')
	} else {
		const db = new sqlite3.Database('./games.sqlite')

		const playthroughData = {
			gameId: req.params.gameId,
			dateStarted: req.body.dateStarted,
			platform: req.body.platform
		}

		const query = generateQuery('insert', playthroughData)

		db.run(`INSERT INTO playthroughs (${query.fields}) VALUES (${query.values})`, function(error) {
			if (error) {
				res.status(500).send(`Error starting new playthrough: ${error}`)
			} else {
				db.run(`UPDATE games SET playing = 1 WHERE rowid = ${req.params.gameId}`, error => {
					if (error) {
						res.status(500).send(`Error setting game to playing: ${error}`)
					} else {
						cache.del(cacheKey)

						res.send({})
					}
				})
			}
		})
	}
})

gamesRouter.put('/playthroughs/finish/:playthroughId', (req, res) => {
	if (req.body.password !== password) {
		res.status(401).send('Invalid password')
	} else {
		const db = new sqlite3.Database('./games.sqlite')

		const playthroughData = {
			dateStarted: req.body.dateStarted,
			dateFinished: req.body.dateFinished,
			hoursPlayed: req.body.hoursPlayed,
			timesCompleted: req.body.timesCompleted,
			platform: req.body.platform
		}

		const setString = generateQuery('update', playthroughData)

		db.run(`UPDATE playthroughs SET ${setString} WHERE rowid = '${req.params.playthroughId}'`, (error) => {
			if (error) {
				res.status(500).send(`Error finishing playthrough: ${error}`)
			} else {
				const gameData = {
					score: req.body.score
				}

				const setString = generateQuery('update', gameData)

				db.run(`UPDATE games SET playing = 0, ${setString} WHERE rowid = ${req.body.gameId}`, (error) => {
					if (error) {
						res.status(500).send(`Error setting game to not playing: ${error}`)
					} else {
						cache.del(cacheKey)

						res.send({})
					}
				})
			}
		})

		db.close()
	}
})

gamesRouter.post('/playthroughs/add/:gameId', (req, res) => {
	if (req.body.password !== password) {
		res.status(401).send('Invalid password')
	} else {
		const db = new sqlite3.Database('./games.sqlite')

		const playthroughData = {
			gameId: req.params.gameId,
			dateStarted: req.body.dateStarted,
			dateFinished: req.body.dateFinished,
			hoursPlayed: req.body.hoursPlayed,
			timesCompleted: req.body.timesCompleted,
			platform: req.body.platform
		}

		const query = generateQuery('insert', playthroughData)

		db.run(`INSERT INTO playthroughs (${query.fields}) VALUES (${query.values})`, function(error) {
			if (error) {
				res.status(500).send(`Error adding new playthrough: ${error}`)
			} else {
				cache.del(cacheKey)

				res.send({})
			}
		})
	}
})

gamesRouter.put('/playthroughs/edit/:playthroughId', (req, res) => {
	if (req.body.password !== password) {
		res.status(401).send('Invalid password')
	} else {
		const db = new sqlite3.Database('./games.sqlite')

		const playthroughData = {
			dateStarted: req.body.dateStarted,
			dateFinished: req.body.dateFinished,
			hoursPlayed: req.body.hoursPlayed,
			timesCompleted: req.body.timesCompleted,
			platform: req.body.platform
		}

		const setString = generateQuery('update', playthroughData)

		db.run(`UPDATE playthroughs SET ${setString} WHERE rowid = ${req.params.playthroughId}`, function(error) {
			if (error) {
				res.status(500).send(`Error updating playthrough: ${error}`)
			} else {
				cache.del(cacheKey)

				res.send({})
			}
		})
	}
})

gamesRouter.delete('/playthroughs/delete/:playthroughId', (req, res) => {
	if (req.body.password !== password) {
		res.status(500).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite')

		db.run(`DELETE FROM playthroughs WHERE rowid = ${req.params.playthroughId}`, function(error) {
			if (error) {
				res.status(500).send(`Error deleting playthrough: ${error}`)
			} else {
				cache.del(cacheKey)

				res.send({})
			}
		})
	}
})

module.exports = gamesRouter
