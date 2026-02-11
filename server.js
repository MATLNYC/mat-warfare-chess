const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', (callback) => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      host: socket.id,
      guest: null,
      gameState: null
    });
    socket.join(roomCode);
    console.log('Room created:', roomCode);
    callback(roomCode);
  });

  socket.on('join-room', (roomCode, callback) => {
    const room = rooms.get(roomCode);
    if (!room) {
      callback({ success: false, message: 'Room not found' });
      return;
    }
    if (room.guest) {
      callback({ success: false, message: 'Room is full' });
      return;
    }
    room.guest = socket.id;
    socket.join(roomCode);
    console.log('Player joined room:', roomCode);
    io.to(room.host).emit('opponent-joined');
    callback({ success: true });
  });

  socket.on('move', (data) => {
    console.log('Move received:', data);
    socket.to(data.roomCode).emit('opponent-move', data.move);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (let [code, room] of rooms) {
      if (room.host === socket.id || room.guest === socket.id) {
        io.to(code).emit('opponent-left');
        rooms.delete(code);
        console.log('Room deleted:', code);
      }
    }
  });
});

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Mat Modern Warfare Chess server running on port ${PORT}`);
});
