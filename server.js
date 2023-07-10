// Import required modules
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


io.on('connection', socket => {
   
  
    socket.on('join-room', (roomId, userId) => {
        console.log('A user connected ' + userId);
      // Join the specified room
      socket.join(roomId);
      
      // Broadcast to other participants in the room that a new user has joined
      socket.to(roomId).emit('user-connected', userId);
      
      socket.on('disconnect', () => {
        // Broadcast to other participants in the room that a user has disconnected
        socket.to(roomId).emit('user-disconnected', userId);
      });
    });
  });

  

// Serve the index.html file for any route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const port = 3000;
http.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
