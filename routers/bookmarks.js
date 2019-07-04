const express = require('express')
const sqlite3 = require('sqlite3')

const bookmarksRouter = express.Router()

bookmarksRouter.get('/read/:category', (req, res) => {
	const category = req.params.category

	const db = new sqlite3.Database('./bookmarks.sqlite', error => {
		if (error) {
			console.log(`Error connecting to database: ${error}`)
		}
	})

	db.all(`SELECT rowid, * FROM bookmarks WHERE category = '${category}' ORDER BY site`, (error, rows) => {
		if (error) {
			res.status(404).send(`Error retrieving bookmarks: ${error}`)
		} else {
			res.json(rows)
		}
	})

	db.close()
})

bookmarksRouter.post('/write', (req, res) => {
	let {
		site,
		url
	} = req.body

	const category = req.body.category

	if (site.includes('\'')) {
		site = site.replace(/'/g, "''")
	}

	if (url.includes('\'')) {
		url = url.replace(/'/g, "''")
	}

	const db = new sqlite3.Database('./bookmarks.sqlite', error => {
		if (error) {
			console.log(`Error connecting to database. ${error}`)
		}
	})

	db.run(`INSERT INTO bookmarks (site, url, category) VALUES ('${site}', '${url}', '${category}')`, error => {
		if (error) {
			console.log(`Error inserting row: ${error}`)
			res.status(404).send()
		} else {
			res.send()
		}
	})

	db.close()
})

bookmarksRouter.put('/edit/:rowid', (req, res) => {
	const rowid = req.params.rowid

	const {
		site,
		url
	} = req.body

	if (site.includes('\'')) {
		site = site.replace(/'/g, "''")
	}

	if (url.includes('\'')) {
		url = url.replace(/'/g, "''")
	}

	const db = new sqlite3.Database('./bookmarks.sqlite', error => {
		if (error) {
			console.log(`Error connecting to database. ${error}`)
		}
	})

	db.run(`UPDATE bookmarks SET site = '${site}', url = '${url}' WHERE rowid = '${rowid}'`, error => {
		if (error) {
			console.log(`Error updating row: ${error}`)
			res.status(404).send()
		} else {
			res.send()
		}
	})

	db.close()
})

bookmarksRouter.delete('/delete/:rowid', (req, res) => {
	const rowid = req.params.rowid

	const db = new sqlite3.Database('./bookmarks.sqlite', error => {
		if (error) {
			console.log(`Error connecting to database. ${error}`)
		}
	})

	db.run(`DELETE FROM bookmarks WHERE rowid = '${rowid}'`, error => {
		if (error) {
			console.log(`Error deleting row: ${error}`)
			res.status(404).send()
		} else {
			res.send()
		}
	})

	db.close()
})

module.exports = bookmarksRouter