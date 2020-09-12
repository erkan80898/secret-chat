const mongoose = require('mongoose')


const roomSchema = mongoose.Schema({

    roomName: {
        type: String,
        minlength: 1,
        required: true,
    },
    roomHash: String,
    roomDate: Date,
    roomCreator: String,
    _users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message'
        }
    ]
})

roomSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        users = returnedObject._users.map(obj => obj.username)
        delete returnedObject._id
        delete returnedObject.__v
        delete returnedObject.roomHash
        delete returnedObject._users
    }
})

const Room = mongoose.model('Room', roomSchema)

module.exports = Room