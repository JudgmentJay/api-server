const express = require('express')
const sqlite3 = require('sqlite3')

const gamesRouter = express.Router()

const password = '$$jaysnewtabpassword$$'

const numberFields = [
	'gameId',
	'lastPlaythroughId',
	'score',
	'playthroughCount',
	'hoursPlayed',
	'completed'
]

const generateInsertQuery = (data) => {
	const dataEntries = Object.entries(data)

	const fieldsToAdd = []

	dataEntries.forEach((param) => {
		if (param[1]) {
			if (param[0] === 'title') {
				if (param[1].includes('\'')) {
					param[1] = param[1].replace(/'/g, '\'\'')
				}
			}

			fieldsToAdd.push({
				field: param[0],
				value: numberFields.includes[param[0]] ? parseInt(param[1]) : param[1]
			})
		}
	})

	const fields = fieldsToAdd.map((field) => field.field).join(', ')
	const values = fieldsToAdd.map((field) => {
		return typeof field.value === 'string' ? `'${field.value}'` : field.value
	}).join(', ')

	return {fields, values}
}

const generateUpdateQuery = (data) => {
	const dataEntries = Object.entries(data)

	const fieldsToUpdate = []

	dataEntries.forEach((param) => {
		if (param[1]) {
			if (param[0] === 'title') {
				if (param[1].includes('\'')) {
					param[1] = param[1].replace(/'/g, '\'\'')
				}
			}

			fieldsToUpdate.push({
				field: param[0],
				value: numberFields.includes[param[0]] ? parseInt(param[1]) : param[1]
			})
		}
	})

	const setString = fieldsToUpdate.map((field) => {
		return `${field.field} = ${typeof field.value === 'string' ? `'${field.value}'` : field.value }`
	}).join(', ')

	return setString
}

gamesRouter.get('/all', (req, res) => {
	const db = new sqlite3.Database('./games.sqlite', error => {
		if (error) {
			console.log(`Error connecting to database: ${error}`)
		}
	})

	db.all(`SELECT rowid AS id, * FROM games ORDER BY title`, (error, games) => {
		if (error) {
			console.log(`Error retrieving games: ${error}`)
			res.status(400).send(`Error retrieving games: ${error}`)
		} else {
			const response = {
				games: {
					playing: [],
					played: [],
					backlog: []
				}
			}

			games.forEach((game) => {
				if (game.hoursPlayedList) {
					game.hoursPlayedList = JSON.parse(game.hoursPlayedList)
				}

				if (game.status === 'playing') {
					response.games.playing.push(game)
				}

				if (game.status === 'dropped' || game.playthroughCount > 0) {
					response.games.played.push(game)
				}

				if (game.status === 'backlog') {
					response.games.backlog.push(game)
				}
			})

			res.json(response)
		}
	})

	db.close()
})

gamesRouter.get('/:gameId/playthroughs', (req, res) => {
	const db = new sqlite3.Database('./games.sqlite', error => {
		if (error) {
			console.log(`Error connecting to database: ${error}`)
		}
	})

	db.all(`SELECT rowid AS id, * FROM playthroughs WHERE gameId = ${req.params.gameId}`, (error, playthroughs) => {
		if (error) {
			console.log(`Error retrieving games: ${error}`)
			res.status(400).send(`Error retrieving games: ${error}`)
		} else {
			playthroughs.sort((playthroughA, playthroughB) => new Date(playthroughA.dateStarted) - new Date(playthroughB.dateStarted))

			res.json(playthroughs)
		}
	})

	db.close()
})

gamesRouter.post('/add', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const gameData = {
			title: req.body.title,
			status: req.body.status,
			releaseDate: req.body.releaseDate,
			score: req.body.score,
			playthroughCount: req.body.playthroughCount
		}

		const query = generateInsertQuery(gameData)

		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		db.run(`INSERT INTO games (${query.fields}) VALUES (${query.values})`, function(error) {
			if (error) {
				console.log(`Error inserting new game: ${error}`)
				res.status(400).send(`Error inserting new game: ${error}`)
			} else {
				if (req.body.status !== 'backlog') {
					const gameId = this.lastID

					const playthroughData = {
						gameId,
						dateStarted: req.body.dateStarted,
						dateFinished: req.body.dateFinished,
						hoursPlayed: req.body.hoursPlayed,
						platform: req.body.platform,
						completed: req.body.completed ? req.body.completed : ''
					}

					const query = generateInsertQuery(playthroughData)

					db.run(`INSERT INTO playthroughs (${query.fields}) VALUES (${query.values})`, function(error) {
						if (error) {
							console.log(`Error inserting new playthrough: ${error}`)
							res.status(400).send(`Error inserting new playthrough: ${error}`)
						} else {
							const gameUpdateData = {
								lastPlaythroughId: this.lastID,
								lastDateStarted: req.body.dateStarted,
								lastDateFinished: req.body.dateFinished,
								hoursPlayedList: req.body.hoursPlayedList ? req.body.hoursPlayedList : ''
							}

							const setString = generateUpdateQuery(gameUpdateData)

							db.run(`UPDATE games SET ${setString} WHERE rowid = ${gameId}`, error => {
								if (error) {
									console.log(`Error updating game with new dates: ${error}`)
									res.status(400).send(`Error updating game with new dates: ${error}`)
								} else {
									res.send()
								}
							})
						}
					})
				} else {
					res.send()
				}
			}
		})

		db.close()
	}
})

gamesRouter.put('/:gameId/edit', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		const gameData = {
			title: req.body.title,
			releaseDate: req.body.releaseDate,
			score: req.body.score,
			playthroughCount: req.body.playthroughCount
		}

		const setString = generateUpdateQuery(gameData)

		db.run(`UPDATE games SET ${setString} WHERE rowid = '${req.params.gameId}'`, error => {
			if (error) {
				console.log(`Error updating row: ${error}`)
				res.status(400).send()
			} else {
				res.send()
			}
		})

		db.close()
	}
})

gamesRouter.post('/:gameId/playthrough-start', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		const playthroughData = {
			gameId: req.params.gameId,
			dateStarted: req.body.dateStarted,
			platform: req.body.platform
		}

		const query = generateInsertQuery(playthroughData)

		db.run(`INSERT INTO playthroughs (${query.fields}) VALUES (${query.values})`, function(error) {
			if (error) {
				console.log(`Error adding new playthrough: ${error}`)
				res.status(400).send(`Error adding new playthrough: ${error}`)
			} else {
				const gameUpdateData = {
					status: 'playing',
					lastDateStarted: req.body.dateStarted,
					lastPlaythroughId: this.lastID
				}

				const setString = generateUpdateQuery(gameUpdateData)

				db.run(`UPDATE games SET ${setString} WHERE rowid = ${req.params.gameId}`, error => {
					if (error) {
						console.log(`Error updating game with new status/playthroughId: ${error}`)
						res.status(400).send(`Error updating game with new status/playthroughId: ${error}`)
					} else {
						res.send()
					}
				})
			}
		})
	}
})

gamesRouter.put('/:gameId/playthrough-finish', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		const playthroughData = {
			dateStarted: req.body.dateStarted,
			dateFinished: req.body.dateFinished,
			hoursPlayed: req.body.hoursPlayed,
			platform: req.body.platform,
			completed: req.body.completed
		}

		const setString = generateUpdateQuery(playthroughData)

		db.run(`UPDATE playthroughs SET ${setString} WHERE rowid = '${req.body.playthroughId}'`, error => {
			if (error) {
				console.log(`Error updating playthrough: ${error}`)
				res.status(400).send(`Error updating playthrough: ${error}`)
			} else {
				const gameUpdateData = {
					status: req.body.status,
					playthroughCount: req.body.playthroughCount,
					lastDateStarted: req.body.dateStarted,
					lastDateFinished: req.body.dateFinished,
					hoursPlayedList: req.body.hoursPlayedList
				}

				const setString = generateUpdateQuery(gameUpdateData)

				db.run(`UPDATE games SET ${setString} WHERE rowid = ${req.params.gameId}`, error => {
					if (error) {
						console.log(`Error updating game with new status/playthrough count: ${error}`)
						res.status(400).send(`Error updating game with new status/playthrough count: ${error}`)
					} else {
						res.send()
					}
				})
			}
		})

		db.close()
	}
})

gamesRouter.post('/:gameId/playthrough-add', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		const playthroughData = {
			gameId: req.params.gameId,
			dateStarted: req.body.dateStarted,
			dateFinished: req.body.dateFinished,
			hoursPlayed: req.body.hoursPlayed,
			platform: req.body.platform,
			completed: req.body.completed
		}

		const query = generateInsertQuery(playthroughData)

		db.run(`INSERT INTO playthroughs (${query.fields}) VALUES (${query.values})`, function(error) {
			if (error) {
				console.log(`Error adding new playthrough: ${error}`)
				res.status(400).send(`Error adding new playthrough: ${error}`)
			} else {
				const gameUpdateData = {
					status: req.body.status,
					playthroughCount: req.body.playthroughCount,
					hoursPlayedList: req.body.hoursPlayedList
				}

				const setString = generateUpdateQuery(gameUpdateData)

				db.run(`UPDATE games SET ${setString} WHERE rowid = ${req.params.gameId}`, error => {
					if (error) {
						console.log(`Error updating game with new status/playthroughId: ${error}`)
						res.status(400).send(`Error updating game with new status/playthroughId: ${error}`)
					} else {
						res.send()
					}
				})
			}
		})
	}
})

module.exports = gamesRouter
