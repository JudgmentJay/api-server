const express = require('express')
const sqlite3 = require('sqlite3')

const gamesRouter = express.Router()

const password = '$$jaysnewtabpassword$$'

gamesRouter.get('/read', (req, res) => {
	const db = new sqlite3.Database('./games.sqlite', error => {
		if (error) {
			console.log(`Error connecting to database: ${error}`)
		}
	})

	db.all(`SELECT rowid, * FROM games ORDER BY status`, (error, games) => {
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

gamesRouter.post('/write', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		let title = req.body.title

		if (title.includes('\'')) {
			title = title.replace(/'/g, '\'\'')
		}

		const {
			releaseDate,
			score,
			playthroughCount,
			status,
			addNewPlaythrough,
		} = req.body

		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		db.run(`INSERT INTO games (title, releaseDate, score, playthroughCount, status) VALUES ('${title}', '${releaseDate}', ${score}, ${playthroughCount}, '${status}')`, function(error) {
			if (error) {
				console.log(`Error inserting new game: ${error}`)
				res.status(400).send(`Error inserting new game: ${error}`)
			} else {
				if (addNewPlaythrough) {
					const gameId = this.lastID

					const {
						dateStarted,
						dateFinished,
						hoursPlayed,
						platform,
						hoursPlayedList
					} = req.body

					db.run(`INSERT INTO playthroughs (gameId, dateStarted, dateFinished, hoursPlayed, platform) VALUES (${gameId}, '${dateStarted}', '${dateFinished}', ${hoursPlayed}, '${platform}')`, function(error) {
						if (error) {
							console.log(`Error inserting new playthrough: ${error}`)
							res.status(400).send(`Error inserting new playthrough: ${error}`)
						} else {
							db.run(`UPDATE games SET lastDateStarted = '${dateStarted}', lastDateFinished = '${dateFinished}', hoursPlayed = '${hoursPlayedList}' WHERE rowid = ${gameId}`, error => {
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
			addNewPlaythrough
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
				if (addNewPlaythrough) {
					const {
						dateStarted,
						dateFinished,
						hoursPlayed,
						platform,
					} = req.body

					db.run(`INSERT INTO playthroughs (gameId, dateStarted, dateFinished, hoursPlayed, platform) VALUES (${rowid}, '${dateStarted}', '${dateFinished}', ${hoursPlayed}, '${platform}')`, function(error) {
						if (error) {
							console.log(`Error inserting new playthrough: ${error}`)
							res.status(400).send(`Error inserting new playthrough: ${error}`)
						} else {
							const playthroughId = this.lastID

							db.run(`UPDATE games SET lastPlaythroughId = ${playthroughId} WHERE rowid = ${rowid}`, error => {
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

gamesRouter.post('/playthrough-add/:gameId', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const gameId = req.params.gameId

		const {
			dateStarted,
			dateFinished,
			hoursPlayed,
			platform,
			updateGame,
			status,
			currentPlaythroughId,
			updateLastPlaythroughId
		} = req.body

		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		db.run(`INSERT INTO playthroughs (gameId, dateStarted, dateFinished, hoursPlayed, platform) VALUES (${gameId}, '${dateStarted}', '${dateFinished}', ${hoursPlayed}, '${platform}')`, function(error) {
			if (error) {
				console.log(`Error adding new playthrough: ${error}`)
				res.status(400).send(`Error adding new playthrough: ${error}`)
			} else {
				if (updateGame) {
					let playthroughId = currentPlaythroughId

					if (updateLastPlaythroughId) {
						playthroughId = this.lastID
					}

					db.run(`UPDATE games SET status = '${status}', lastPlaythroughId = ${playthroughId} WHERE rowid = ${gameId}`, error => {
						if (error) {
							console.log(`Error updating game with new status/playthroughId: ${error}`)
							res.status(400).send(`Error updating game with new status/playthroughId: ${error}`)
						} else {
							res.send()
						}
					})
				} else {
					res.send()
				}
			}
		})
	}
})

gamesRouter.put('/playthrough-edit/:rowid', (req, res) => {
	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const rowid = req.params.rowid

		const {
			dateStarted,
			dateFinished,
			hoursPlayed,
			platform,
			gameId,
			status,
			playthroughCount
		} = req.body

		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		db.run(`UPDATE playthroughs SET dateStarted = '${dateStarted}', dateFinished = '${dateFinished}', hoursPlayed = ${hoursPlayed}, platform = '${platform}' WHERE rowid = '${rowid}'`, error => {
			if (error) {
				console.log(`Error updating playthrough: ${error}`)
				res.status(400).send(`Error updating playthrough: ${error}`)
			} else {
				db.run(`UPDATE games SET status = '${status}', playthroughCount = ${playthroughCount} WHERE rowid = ${gameId}`, error => {
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
