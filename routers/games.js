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

	db.all(`SELECT g.rowid, g.*, p.dateStarted, p.dateFinished, p.hoursPlayed, p.platform FROM games g LEFT OUTER JOIN playthroughs p ON g.lastPlaythroughId = p.rowid ORDER BY status`, (error, rows) => {
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

			rows.forEach((row) => {
				if (row.status === 'playing') {
					response.games.playing.push(row)
				}

				if (row.status === 'played' || row.status === 'dropped' || row.playthroughCount > 0) {
					response.games.played.push(row)
				}

				if (row.status === 'backlog') {
					response.games.backlog.push(row)
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

		const lastPlaythroughId = null

		const db = new sqlite3.Database('./games.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		db.run(`INSERT INTO games (title, releaseDate, score, playthroughCount, status, lastPlaythroughId) VALUES ('${title}', '${releaseDate}', ${score}, ${playthroughCount}, '${status}', ${lastPlaythroughId})`, function(error) {
			if (error) {
				console.log(`Error inserting game row: ${error}`)
				res.status(400).send()
			} else {
				if (addNewPlaythrough) {
					const gameId = this.lastID

					const {
						dateStarted,
						dateFinished,
						hoursPlayed,
						platform
					} = req.body

					db.run(`INSERT INTO playthroughs (gameId, dateStarted, dateFinished, hoursPlayed, platform) VALUES (${gameId}, '${dateStarted}', '${dateFinished}', ${hoursPlayed}, '${platform}')`, function(error) {
						if (error) {
							console.log(`Error inserting playthrough row: ${error}`)
							res.status(400).send()
						} else {
							const playthroughId = this.lastID

							db.run(`UPDATE games SET lastPlaythroughId = ${playthroughId} WHERE rowid = ${gameId}`, error => {
								if (error) {
									console.log(`Error updating game with new playthrough ID: ${error}`)
									res.status(400).send(`Error updating game with new playthrough ID`)
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
			addNewPlaythrough,
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
						updateLastPlaythroughId
					} = req.body

					db.run(`INSERT INTO playthroughs (gameId, dateStarted, dateFinished, hoursPlayed, platform) VALUES (${rowid}, '${dateStarted}', '${dateFinished}', ${hoursPlayed}, '${platform}')`, function(error) {
						if (error) {
							console.log(`Error inserting playthrough row: ${error}`)
							res.status(400).send()
						} else {
							if (updateLastPlaythroughId) {
								const playthroughId = this.lastID

								db.run(`UPDATE games SET lastPlaythroughId = ${playthroughId} WHERE rowid = ${rowid}`, error => {
									if (error) {
										console.log(`Error updating game with new playthrough ID: ${error}`)
										res.status(400).send(`Error updating game with new playthrough ID`)
									} else {
										res.send()
									}
								})
							} else {
								res.send()
							}
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

gamesRouter.delete('/delete/:rowid', (req, res) => {
	const rowid = req.params.rowid

	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		const db = new sqlite3.Database('./bookmarks.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		db.run(`DELETE FROM bookmarks WHERE rowid = '${rowid}'`, error => {
			if (error) {
				console.log(`Error deleting row: ${error}`)
				res.status(400).send()
			} else {
				res.send()
			}
		})

		db.close()
	}
})

module.exports = gamesRouter
