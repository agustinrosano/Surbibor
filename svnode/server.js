const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

// Game State in memory
let rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, playerData) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        players: {},
        hostId: socket.id
      };
    }

    rooms[roomId].players[socket.id] = {
      id: socket.id,
      ...playerData
    };

    // Update room list for everyone in the room
    io.to(roomId).emit('player-joined', rooms[roomId].players);
    console.log(`Player ${socket.id} joined room ${roomId} as ${playerData.charType}`);
  });

  socket.on('player-move', (roomId, moveData) => {
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      const p = rooms[roomId].players[socket.id];
      p.x = moveData.x;
      p.y = moveData.y;
      p.anim = moveData.anim;
      p.hp = moveData.hp;
      
      socket.to(roomId).emit('player-moved', {
        id: socket.id,
        ...moveData
      });
    }
  });

  socket.on('sync-enemies', (roomId, enemyData) => {
    // Only relay enemy data from the host
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
      socket.to(roomId).emit('enemies-update', enemyData);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        
        // If host left, assign new host
        if (rooms[roomId].hostId === socket.id) {
          const remainingIds = Object.keys(rooms[roomId].players);
          if (remainingIds.length > 0) {
            rooms[roomId].hostId = remainingIds[0];
            console.log(`New host for room ${roomId}: ${rooms[roomId].hostId}`);
          } else {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted`);
            continue;
          }
        }
        
        io.to(roomId).emit('player-left', socket.id);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`BubbaSurvivor Multi-Server running on port ${PORT}`);
});
