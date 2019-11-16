const express = require('express')
const sqlite3 = require('sqlite3')

const gamesRouter = express.Router()

const password = '$$jaysnewtabpassword$$'

const generateInsertQuery = (type, body) => {
	const validFields = {
		game: [
			'title',
			'status',
			'releaseDate',
			'score',
			'playthroughCount'
		],
		playthrough: [
			'dateStarted',
			'dateFinished',
			'hoursPlayed',
			'platform'
		]
	}

	const numberFields = [
		'score',
		'playthroughCount',
		'hoursPlayed'
	]

	const bodyData = Object.entries(body)

	const fieldsToAdd = []

	bodyData.forEach((param) => {
		if (validFields[type].includes(param[0]) && param[1] !== '') {
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

const generateUpdateQuery = (type, body) => {
	const validFields = {
		gamePlaythrough: [
			'dateStarted',
			'dateFinished',
			'hoursPlayedList'
		]
	}

	const numberFields = [
		'score',
		'playthroughCount',
		'hoursPlayed'
	]

	const bodyData = Object.entries(body)

	const fieldsToAdd = []

	bodyData.forEach((param) => {
		if (validFields[type].includes(param[0]) && param[1] !== '') {
			if (type === 'gamePlaythrough') {
				if (param[0] === 'dateStarted') { param[0] = 'lastDateStarted' }
				if (param[0] === 'dateFinished') { param[0] = 'lastDateFinished' }
			}

			fieldsToAdd.push({
				field: param[0],
				value: numberFields.includes[param[0]] ? parseInt(param[1]) : param[1]
			})
		}
	})

	const setString = fieldsToAdd.map((field) => {
		return `${field.field} = ${typeof field.value === 'string' ? `'${field.value}'` : field.value }`
	}).join(', ')

	return setString
}

gamesRouter.get('/read', (req, res) => {
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
				if (game.status === 'playing') {
					response.games.playing.push(game)
				}

				if (game.status === 'played' || game.status === 'dropped' || game.playthroughCount > 0) {
					game.hoursPlayedList = JSON.parse(game.hoursPlayedList)

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

gamesRouter.get('/playthroughs/:gameId', (req, res) => {
	const gameId = req.params.gameId

	const db = new sqlite3.Database('./games.sqlite', error => {
		if (error) {
			console.log(`Error connecting to database: ${error}`)
		}
	})

	db.all(`SELECT rowid AS id, * FROM playthroughs WHERE gameId = ${gameId} ORDER BY dateStarted`, (error, playthrough) => {
		if (error) {
			console.log(`Error retrieving games: ${error}`)
			res.status(400).send(`Error retrieving games: ${error}`)
		} else {
			res.json(playthrough)
		}
	})

	db.close()
})

gamesRouter.post('/add', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const query = generateInsertQuery('game', req.body)

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
				if (req.body.addPlaythroughData) {
					const gameId = this.lastID

					const query = generateInsertQuery('playthrough', req.body)

					db.run(`INSERT INTO playthroughs (gameId, ${query.fields}) VALUES (${gameId}, ${query.values})`, function(error) {
						if (error) {
							console.log(`Error inserting new playthrough: ${error}`)
							res.status(400).send(`Error inserting new playthrough: ${error}`)
						} else {
							const playthroughId = this.lastID

							const setString = generateUpdateQuery('gamePlaythrough', req.body)

							db.run(`UPDATE games SET lastPlaythroughId = ${playthroughId}, ${setString} WHERE rowid = ${gameId}`, error => {
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

gamesRouter.put('/edit/:rowid', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const rowid = req.params.rowid

		let title = req.body.title

		if (title.includes('\'')) {
			title = title.replace(/'/g, '\'\'')
		}

		const {
			releaseDate,
			score,
			playthroughCount,
			status,
			addPlaythroughData
		} = req.body

		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		db.run(`UPDATE games SET title = '${title}', releaseDate = '${releaseDate}', score = ${score}, playthroughCount = ${playthroughCount}, status = '${status}' WHERE rowid = '${rowid}'`, error => {
			if (error) {
				console.log(`Error updating row: ${error}`)
				res.status(400).send()
			} else {
				if (addPlaythroughData) {
					const {
						dateStarted,
						dateFinished,
						hoursPlayed,
						platform
					} = req.body

					db.run(`INSERT INTO playthroughs (gameId, dateStarted, dateFinished, hoursPlayed, platform) VALUES (${rowid}, '${dateStarted}', '${dateFinished}', ${hoursPlayed}, '${platform}')`, function(error) {
						if (error) {
							console.log(`Error inserting new playthrough: ${error}`)
							res.status(400).send(`Error inserting new playthrough: ${error}`)
						} else {
							const playthroughId = this.lastID

							db.run(`UPDATE games SET lastDateStarted = '${dateStarted}', lastDateFinished = '${dateFinished}', lastPlaythroughId = ${playthroughId} WHERE rowid = ${rowid}`, error => {
								if (error) {
									console.log(`Error updating game with new playthrough ID: ${error}`)
									res.status(400).send(`Error updating game with new playthrough ID: ${error}`)
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

gamesRouter.post('/playthrough-start/:gameId', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const gameId = req.params.gameId

		const {
			status,
			dateStarted,
			platform
		} = req.body

		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		db.run(`INSERT INTO playthroughs (gameId, dateStarted, platform) VALUES (${gameId}, '${dateStarted}', '${platform}')`, function(error) {
			if (error) {
				console.log(`Error adding new playthrough: ${error}`)
				res.status(400).send(`Error adding new playthrough: ${error}`)
			} else {
				const playthroughId = this.lastID

				db.run(`UPDATE games SET status = '${status}', lastDateStarted = '${dateStarted}', lastPlaythroughId = ${playthroughId} WHERE rowid = ${gameId}`, error => {
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

gamesRouter.put('/playthrough-finish/:playthroughId', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const playthroughId = req.params.playthroughId

		const {
			dateStarted,
			dateFinished,
			platform,
			hoursPlayed,
			gameId,
			status,
			playthroughCount,
			hoursPlayedList
		} = req.body

		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		db.run(`UPDATE playthroughs SET dateStarted = '${dateStarted}', dateFinished = '${dateFinished}', hoursPlayed = ${hoursPlayed}, platform = '${platform}' WHERE rowid = '${playthroughId}'`, error => {
			if (error) {
				console.log(`Error updating playthrough: ${error}`)
				res.status(400).send(`Error updating playthrough: ${error}`)
			} else {
				db.run(`UPDATE games SET status = '${status}', playthroughCount = ${playthroughCount}, hoursPlayed = '${hoursPlayedList}' WHERE rowid = ${gameId}`, error => {
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

module.exports = gamesRouter
