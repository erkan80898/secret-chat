const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose');
const roomRouter = require('express').Router()
const Room = require('../models/room')
const User = require('../models/user')
const Message = require('../models/message')

const getTokenFrom = request => {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}

roomRouter.get('/', async (request, response) => {

    const token = getTokenFrom(request)

    try {
        const decodedToken = jwt.verify(token, process.env.SECRET)

        const data = await User
            .findById(decodedToken.id).select('rooms')

        const all = await Promise.all(data.rooms.map(async room => await Room.findById(room)))

        return response.json(all)
    } catch {
        return response.status(401).json({ error: 'invalid token' })
    }
})

roomRouter.get('/:id', async (request, response) => {

    const token = getTokenFrom(request)

    try {
        const decodedToken = jwt.verify(token, process.env.SECRET)

        const user = await User.findById(decodedToken.id)

        const goalRoom = request.params.id;

        const hasRoom = user.rooms.includes(goalRoom)

        if (!hasRoom) {
            return response
                .status(400)
                .json({ error: 'no such room for user' })
        }

        const room = await Room.findById(goalRoom).populate('messages')

        return response.json(room)
    } catch (error) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

})

roomRouter.post('/', async (request, response) => {
    const body = request.body
    const token = getTokenFrom(request)

    try {
        const decodedToken = jwt.verify(token, process.env.SECRET)

        const user = await User.findById(decodedToken.id)

        const saltRounds = 10
        const roomHash = await bcrypt.hash(body.roomPass, saltRounds)

        const room = new Room({
            roomName: body.roomName,
            roomHash,
            roomDate: new Date(),
            roomCreator: user.username,
            _users: [user],
            messages: []
        })

        const savedRoom = await room.save()
        user.rooms = user.rooms.concat(savedRoom._id)
        await user.save()

        response.json(savedRoom.toJSON())
    } catch {
        return response.status(401).json({ error: 'token missing or invalid' })
    }
})

roomRouter.delete('/:id', async (request, response) => {
    const token = getTokenFrom(request)

    try {
        const decodedToken = jwt.verify(token, process.env.SECRET)

        const user = await User.findById(decodedToken.id)

        const roomToDelete = request.params.id;

        const hasRoom = user.rooms.includes(roomToDelete)

        let room = await Room
            .findById(roomToDelete)
            .populate("_users", { rooms: 1 })

        if (!hasRoom || !room) {
            return response.status(404).end()
        }

        if (room.roomCreator !== user.username) {
            return response
                .status(403)
                .json({ error: "can't delete room - not the creator" })
        }

        let usersInRoom = room._users

        await usersInRoom.forEach(async user => {
            await user.rooms.pull(roomToDelete)
            await user.save()
        })

        await room.delete()
        return response.status(204).end()
    } catch {
        return response.status(401).json({ error: 'token missing or invalid' })
    }
})

roomRouter.patch('/join/:id', async (request, response) => {

    const pass = request.body.password
    const id = request.params.id
    const token = getTokenFrom(request)

    try {
        const decodedToken = jwt.verify(token, process.env.SECRET)

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return response
                .status(400)
                .json({ error: 'malformed id' })
        }

        const user = await User.findById(decodedToken.id)
        const room = await Room.findById(id)

        if (!room) {
            return response
                .status(400)
                .json({ error: 'invalid room ID' })
        }

        if (await bcrypt.compare(pass, room.roomHash)
            && !user.rooms.includes(room._id)) {

            user.rooms.push(room._id)
            await user.save()
            room._users.push(user)
            await room.save()
            return response.status(200).end()
        } else {
            return response
                .status(400)
                .json({ error: 'bad room password or already in it' })
        }
    } catch {
        return response.status(401).json({ error: 'token missing or invalid' })
    }
})

roomRouter.patch('/leave/:id', async (request, response) => {

    const token = getTokenFrom(request)

    try {

        const decodedToken = jwt.verify(token, process.env.SECRET)

        const user = await User.findById(decodedToken.id)
        const room = await Room.findById(request.params.id)

        if (user.rooms.includes(room._id)) {
            if (room.roomCreator === user.username) {
                return response
                    .status(400)
                    .json({ error: 'can\'t leave as the room creator - delete the room instead' })
            }

            user.rooms.pull(room._id)
            await user.save()
            room._users.pull(user)
            await room.save()
            return response.status(200).end()
        } else {
            return response
                .status(400)
                .json({ error: 'bad room password or user not in room' })
        }
    } catch {
        return response.status(401).json({ error: 'token missing or invalid' })
    }
})

roomRouter.post('/:id/message', async (request, response) => {

    const token = getTokenFrom(request)

    try {
        const decodedToken = jwt.verify(token, process.env.SECRET)

        const user = await User.findById(decodedToken.id)
        const room = await Room.findById(request.params.id).populate('messages')

        if (!room || !user.rooms.includes(request.params.id)) {
            response.status(404).json({
                error: 'user is either not part of the room or no such room'
            })
        }

        const content = request.body.content
        const message = new Message({
            content,
            date: new Date(),
            user: user.username
        })
        room.messages.push(message)
        await message.save()
        await room.save()
        return response.json(room)
    } catch {
        return response.status(401).json({ error: 'token missing or invalid message' })
    }
})

module.exports = roomRouter
