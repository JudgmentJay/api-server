const mongoose = require('mongoose')

const passwordSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	url: {
		type: String,
		required: true
	},
	id: {
		type: String,
		required: true
	},
	pass: {
		type: String,
		required: true
	},
	category: {
		type: String,
		required: true
	},
	img: {
		type: String,
		required: true
	}
})

const Password = mongoose.model('password', passwordSchema)

module.exports = Password
