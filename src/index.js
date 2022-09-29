const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");

const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");

const app = express();
const server = http.createServer(app);
const io = socketio(server); // It needs a http server. With express, It creates the server behind the scene and we dont have access to it.

const port = process.env.PORT || 3000;
const publicDirPath = path.join(__dirname, "../public");

app.use(express.static(publicDirPath));

// let count = 0
// server (emit) --> client (receive) --> countUpdate
// client (emit) --> server (receive) --> increment

io.on("connection", (socket) => {

  socket.on('join', (options, callback) => {
    const {error, user} = addUser({
      id: socket.id,
      ...options
    })

    if(error) {
      return callback(error)
    }
    socket.join(user.room)
    // socket.emit, io.emit, socket.broadcast.emit
    // io.to.emit -- (send to everybody in the room)
    // socket.broadcast.to.emit -- (send to everybody but this socket in the room)
    socket.emit("message", generateMessage('Notification', `Welcome to the room! ${user.username}`));
    socket.broadcast.to(user.room).emit("message", generateMessage('Notification', `${user.username} has joined.`)); 
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    })
    callback()
  });

  // For acknowledgement add callback function. You can send any data also back to the client.
  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id)
    const filter = new Filter();
    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed.");
    }
    io.to(user.room).emit("message", generateMessage(user.username,message));
    callback();
  });

  socket.on("sendLocation", ({ latitude, longitude }, callback) => {
    const user = getUser(socket.id)
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(user.username,
        `https://www.google.com/maps?q=${latitude},${longitude}`
      )
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id)
    if(user) {
      io.to(user.room).emit("message", generateMessage('Notification', `${user.username} has left!`));
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      })
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up and running on ${port}`);
});
