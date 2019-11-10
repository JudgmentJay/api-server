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

	db.all(`SELECT rowid, * FROM games ORDER BY status`, (error, rows) => {
		if (error) {
			console.log(`Error retrieving games: ${error}`)
			res.status(400).send(`Error retrieving games: ${error}`)
		} else {
			const response = {
				games: {
					playing: [],
					played: [],
					backlog: []
				},
				playthroughs: []
			}

			const playthroughIds = []

			rows.forEach((row) => {
				row.status = JSON.parse(row.status)

				if (row.lastPlaythroughId) {
					playthroughIds.push(row.lastPlaythroughId)
				}

				if (row.status.includes('playing')) {
					response.games.playing.push(row)
				}


				if (row.status.includes('played')) {
					response.games.played.push(row)
				}

				if (row.status.includes('backlog')) {
					response.games.backlog.push(row)
				}
			})

			db.all(`SELECT rowid, * FROM playthroughs WHERE rowid IN (${playthroughIds.join(',')})`, (error, rows) => {
				if (error) {
					console.log(`Error retrieving playthroughs: ${error}`)
					res.status(400).send(`Error retrieving playthroughs: ${error}`)
				} else {
					rows.forEach((row) => {
						response.playthroughs.push(row)
					})

					res.json(response)
				}
			})
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
			newPlaythrough,
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
				if (newPlaythrough) {
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
	const rowid = req.params.rowid

	let {
		site,
		url
	} = req.body

	if (req.body.password !== password) {
		res.status(400).send()
	} else {
		if (site.includes('\'')) {
			site = site.replace(/'/g, '\'\'')
		}

		if (url.includes('\'')) {
			url = url.replace(/'/g, '\'\'')
		}

		const db = new sqlite3.Database('./bookmarks.sqlite', error => {
			if (error) {
				console.log(`Error connecting to database. ${error}`)
			}
		})

		db.run(`UPDATE bookmarks SET site = '${site}', url = '${url}' WHERE rowid = '${rowid}'`, error => {
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
