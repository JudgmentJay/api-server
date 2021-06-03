const express = require('express')
const axios = require('axios')

const flickrRouter = express.Router()

const baseUrl = 'https://api.flickr.com/services/rest'
const userId = process.env.FLICKR_ID
const apiKey = process.env.FLICKR_API_KEY
const credentials = `api_key=${apiKey}&user_id=${userId}`
const format = 'format=json&nojsoncallback=1'

flickrRouter.get('/photosets', (req, res) => {
	axios.get(`${baseUrl}/?method=flickr.photosets.getList&${credentials}&${format}`)
		.then((response) => {
			const photosets = response.data.photosets.photoset.map((photoset) => {
				return {
					id: photoset.id,
					number: photoset.photos,
					title: photoset.title._content
				}
			})

			res.json(photosets)
		})
		.catch((error) => {
			res.status(500).send(`Error fetching photosets: ${error}`)
		})
})

flickrRouter.get('/photos', (req, res) => {
	axios.get(`${baseUrl}/?method=flickr.people.getPhotos&${credentials}&extras=original_format&${format}`)
		.then((response) => {
			const photos = response.data.photos.photo.map((photo) => {
				return {
					id: photo.id,
					secret: photo.secret,
					server: photo.server,
					farm: photo.farm,
					title: photo.title,
					osecret: photo.originalsecret
				}
			})

			res.json(photos)
		})
		.catch((error) => {
			res.status(500).send(`Error fetching photos: ${error}`)
		})
})

flickrRouter.get('/filterPhotos/:photoset', (req, res) => {
	const photoset = req.params.photoset

	axios.get(`${baseUrl}/?method=flickr.photosets.getPhotos&${credentials}&photoset_id=${photoset}&extras=original_format&${format}`)
		.then((response) => {
			const photos = response.data.photoset.photo.map((photo) => {
				return {
					id: photo.id,
					secret: photo.secret,
					server: photo.server,
					farm: photo.farm,
					title: photo.title,
					osecret: photo.originalsecret
				}
			})

			res.json(photos)
		})
		.catch((error) => {
			res.status(500).send(`Error filtering photos: ${error}`)
		})
})

module.exports = flickrRouter
