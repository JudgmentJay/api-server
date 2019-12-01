const express = require('express')
const sqlite3 = require('sqlite3')

const gamesRouter = express.Router()

const password = '$$jaysnewtabpassword$$'

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
	const db = new sqlite3.Database('./games.sqlite', error => {
		if (error) {
			console.log(`Error connecting to database: ${error}`)
		}
	})

	db.all(`SELECT rowid AS id, * FROM playthroughs ORDER BY dateFinished`, (error, playthroughs) => {
		if (error) {
			console.log(`Error retrieving playthroughs: ${error}`)
			res.status(404).send(`Error retrieving playthroughs: ${error}`)
		} else {
			playthroughs = playthroughs.sort((playthroughA, playthroughB) => new Date(playthroughB.dateStarted) - new Date(playthroughA.dateStarted))

			db.all(`SELECT rowid AS id, * FROM games ORDER BY ltrim(title, 'The ')`, (error, games) => {
				if (error) {
					console.log(`Error retrieving games: ${error}`)
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

					res.json(dataToSend)
				}
			})
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
			releaseDate: req.body.releaseDate,
			score: req.body.score,
			playing: req.body.playing
		}

		const query = generateQuery('insert', gameData)

		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database: ${error}`)
			}
		})

		db.run(`INSERT INTO games (${query.fields}) VALUES (${query.values})`, function(error) {
			if (error) {
				console.log(`Error adding new game: ${error}`)
				res.status(404).send(`Error adding new game: ${error}`)
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
							console.log(`Error adding new game playthrough: ${error}`)
							res.status(404).send(`Error adding new game playthrough: ${error}`)
						} else {
							res.send()
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

gamesRouter.put('/edit/:gameId', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database: ${error}`)
			}
		})

		const gameData = {
			title: req.body.title,
			releaseDate: req.body.releaseDate,
			score: req.body.score
		}

		const setString = generateQuery('update', gameData)

		db.run(`UPDATE games SET ${setString} WHERE rowid = '${req.params.gameId}'`, error => {
			if (error) {
				console.log(`Error updating game: ${error}`)
				res.status(404).send()
			} else {
				res.send()
			}
		})

		db.close()
	}
})

gamesRouter.delete('/delete/:gameId', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database: ${error}`)
			}
		})

		db.run(`DELETE FROM games WHERE rowid = '${req.params.gameId}'`, error => {
			if (error) {
				console.log(`Error deleting game: ${error}`)
				res.status(404).send()
			} else {
				res.send()
			}
		})

		db.close()
	}
})

gamesRouter.post('/playthrough-start/:gameId', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database: ${error}`)
			}
		})

		const playthroughData = {
			gameId: req.params.gameId,
			dateStarted: req.body.dateStarted,
			platform: req.body.platform
		}

		const query = generateQuery('insert', playthroughData)

		db.run(`INSERT INTO playthroughs (${query.fields}) VALUES (${query.values})`, function(error) {
			if (error) {
				console.log(`Error starting new playthrough: ${error}`)
				res.status(404).send(`Error starting new playthrough: ${error}`)
			} else {
				db.run(`UPDATE games SET playing = 1 WHERE rowid = ${req.params.gameId}`, error => {
					if (error) {
						console.log(`Error setting game to playing: ${error}`)
						res.status(404).send(`Error setting game to playing: ${error}`)
					} else {
						res.send()
					}
				})
			}
		})
	}
})

gamesRouter.put('/playthrough-finish/:playthroughId', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database: ${error}`)
			}
		})

		const playthroughData = {
			dateStarted: req.body.dateStarted,
			dateFinished: req.body.dateFinished,
			hoursPlayed: req.body.hoursPlayed,
			timesCompleted: req.body.timesCompleted,
			platform: req.body.platform
		}

		const setString = generateQuery('update', playthroughData)

		db.run(`UPDATE playthroughs SET ${setString} WHERE rowid = '${req.params.playthroughId}'`, error => {
			if (error) {
				console.log(`Error finishing playthrough: ${error}`)
				res.status(404).send(`Error finishing playthrough: ${error}`)
			} else {
				const gameData = {
					score: req.body.score
				}

				const setString = generateQuery('update', gameData)

				db.run(`UPDATE games SET playing = 0, ${setString} WHERE rowid = ${req.body.gameId}`, error => {
					if (error) {
						console.log(`Error setting game to not playing: ${error}`)
						res.status(404).send(`Error setting game to not playing: ${error}`)
					} else {
						res.send()
					}
				})
			}
		})

		db.close()
	}
})

gamesRouter.post('/playthrough-edit/:playthroughId', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database: ${error}`)
			}
		})

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
				console.log(`Error updating playthrough: ${error}`)
				res.status(404).send(`Error updating playthrough: ${error}`)
			} else {
				res.send()
			}
		})
	}
})

gamesRouter.post('/playthrough-add/:gameId', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database: ${error}`)
			}
		})

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
				console.log(`Error adding new playthrough: ${error}`)
				res.status(404).send(`Error adding new playthrough: ${error}`)
			} else {
				res.send()
			}
		})
	}
})

module.exports = gamesRouter
