const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Game State
let players = {};
let rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, playerData) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        players: {}
      };
    }

    rooms[roomId].players[socket.id] = {
      id: socket.id,
      ...playerData
    };

    io.to(roomId).emit('player-joined', rooms[roomId].players);
    console.log(`Player ${socket.id} joined room ${roomId}`);
  });

  socket.on('player-move', (roomId, moveData) => {
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      rooms[roomId].players[socket.id].x = moveData.x;
      rooms[roomId].players[socket.id].y = moveData.y;
      rooms[roomId].players[socket.id].anim = moveData.anim;
      
      // Broadcast movement to others in the room
      socket.to(roomId).emit('player-moved', {
        id: socket.id,
        x: moveData.x,
        y: moveData.y,
        anim: moveData.anim
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Cleanup player from all rooms
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit('player-left', socket.id);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`BubbaSurvivor Server running on port ${PORT}`);
});
