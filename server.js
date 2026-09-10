const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let roomState = {
  videoUrl: '',
  currentTime: 0,
  isPlaying: false
};

io.on('connection', (socket) => {
  socket.emit('sync-state', roomState);

  socket.on('video-action', (data) => {
    roomState.currentTime = data.time;
    roomState.isPlaying = data.playing;
    if (data.url) roomState.videoUrl = data.url;
    socket.broadcast.emit('video-action', data);
  });

  socket.on('chat-message', (data) => {
    io.emit('chat-message', data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
