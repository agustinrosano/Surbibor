const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS Configuration: Only allow your Vercel URL and localhost for development
const io = new Server(server, {
  cors: {
    origin: [
      "https://surbibor-zl6b.vercel.app", 
      "http://localhost:5173"
    ],
    methods: ["GET", "POST"]
  }
});

// Port provided by Render or default to 3000
const PORT = process.env.PORT || 3000;

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

    io.to(roomId).emit('player-joined', rooms[roomId].players);
    console.log(`Player ${socket.id} joined room ${roomId}`);
  });

  socket.on('player-move', (roomId, moveData) => {
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      const p = rooms[roomId].players[socket.id];
      p.x = moveData.x;
      p.y = moveData.y;
      p.anim = moveData.anim;
      p.hp = moveData.hp;
      p.abilities = moveData.abilities || [];
      
      socket.to(roomId).emit('player-moved', {
        id: socket.id,
        ...moveData
      });
    }
  });

  socket.on('sync-enemies', (roomId, enemyData) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
      socket.to(roomId).emit('enemies-update', enemyData);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        
        if (rooms[roomId].hostId === socket.id) {
          const remainingIds = Object.keys(rooms[roomId].players);
          if (remainingIds.length > 0) {
            rooms[roomId].hostId = remainingIds[0];
          } else {
            delete rooms[roomId];
            continue;
          }
        }
        io.to(roomId).emit('player-left', socket.id);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`BubbaSurvivor Server live on port ${PORT}`);
});
