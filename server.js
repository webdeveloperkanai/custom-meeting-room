// server.js
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

const connectedUsers = {}; // Keep track of connected users in each room

io.on('connection', socket => {
  console.log('A user connected');

  socket.on('join-room', (roomId, userId, stream) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);

    if (!connectedUsers[roomId]) {
      connectedUsers[roomId] = [];
    }

    // Add the user to the connected users array with their stream
    connectedUsers[roomId].push({ userId, stream });

    socket.emit('existing-users', connectedUsers[roomId]);

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);

      if (connectedUsers[roomId]) {
        const index = connectedUsers[roomId].findIndex(user => user.userId === userId);
        if (index > -1) {
          connectedUsers[roomId].splice(index, 1);
        }
        if (connectedUsers[roomId].length === 0) {
          delete connectedUsers[roomId];
        }
      }
    });

    socket.on('offer', (targetUserId, offer) => {
      socket.to(targetUserId).emit('offer', userId, offer);
    });

    socket.on('answer', (targetUserId, answer) => {
      socket.to(targetUserId).emit('answer', userId, answer);
    });

    socket.on('ice-candidate', (targetUserId, iceCandidate) => {
      socket.to(targetUserId).emit('ice-candidate', userId, iceCandidate);
    });
  });
});

// Serve the index.html file for any route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
const port = 3000;
http.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
