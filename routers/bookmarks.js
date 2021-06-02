const express = require('express')
const sqlite3 = require('sqlite3')
const cache = require('memory-cache')

const bookmarksRouter = express.Router()

const cacheKey = 'bookmarks'

const password = process.env.SERVER_PW

bookmarksRouter.get('/read', (req, res) => {
	const cachedData = cache.get(cacheKey)

	if (cachedData) {
		res.json(cachedData)
	} else {
		const db = new sqlite3.Database('./bookmarks.sqlite')

		db.all(`SELECT rowid, * FROM bookmarks ORDER BY LOWER(REPLACE(site, 'The ', ''))`, (error, rows) => {
			if (error) {
				res.status(404).send(`Error retrieving bookmarks: ${error}`)
			} else {
				cache.put(cacheKey, rows)

				res.json(rows)
			}
		})

		db.close()
	}
})

bookmarksRouter.post('/write', (req, res) => {
	let {
		site,
		url
	} = req.body

	const category = req.body.category

	if (req.body.password !== password) {
		res.status(401).send('Invalid password')
	} else {
		if (site.includes('\'')) {
			site = site.replace(/'/g, '\'\'')
		}

		if (url.includes('\'')) {
			url = url.replace(/'/g, '\'\'')
		}

		const db = new sqlite3.Database('./bookmarks.sqlite')

		db.run(`INSERT INTO bookmarks (site, url, category) VALUES ('${site}', '${url}', '${category}')`, error => {
			if (error) {
				res.status(500).send(`Error inserting bookmark: ${error}`)
			} else {
				cache.del(cacheKey)

				res.send({})
			}
		})

		db.close()
	}
})

bookmarksRouter.put('/edit/:rowid', (req, res) => {
	const rowid = req.params.rowid

	let {
		site,
		url
	} = req.body

	if (req.body.password !== password) {
		res.status(401).send('Invalid password')
	} else {
		if (site.includes('\'')) {
			site = site.replace(/'/g, '\'\'')
		}

		if (url.includes('\'')) {
			url = url.replace(/'/g, '\'\'')
		}

		const db = new sqlite3.Database('./bookmarks.sqlite')

		db.run(`UPDATE bookmarks SET site = '${site}', url = '${url}' WHERE rowid = '${rowid}'`, error => {
			if (error) {
				res.status(500).send(`Error updating bookmark: ${error}`)
			} else {
				cache.del(cacheKey)

				res.send({})
			}
		})

		db.close()
	}
})

bookmarksRouter.delete('/delete/:rowid', (req, res) => {
	const rowid = req.params.rowid

	if (req.body.password !== password) {
		res.status(401).send('Invalid password')
	} else {
		const db = new sqlite3.Database('./bookmarks.sqlite')

		db.run(`DELETE FROM bookmarks WHERE rowid = '${rowid}'`, error => {
			if (error) {
				res.status(500).send(`Error deleting bookmark: ${error}`)
			} else {
				cache.del(cacheKey)

				res.send({})
			}
		})

		db.close()
	}
})

module.exports = bookmarksRouter
