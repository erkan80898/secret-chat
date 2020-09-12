const mongoose = require('mongoose')


const messageSchema = mongoose.Schema({
    content: {
        type: String,
        require: true,
        minlength: 1
    },
    date: {
        type: Date,
        require: true,
    },
    user: String
})

messageSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

const Message = mongoose.model('Message', messageSchema)

module.exports = Message