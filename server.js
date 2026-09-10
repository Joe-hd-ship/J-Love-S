const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let messages = [];
let currentVideoState = { url: '', currentTime: 0, isPlaying: false };

// إرسال الصفحة والتصميم والـ JavaScript المباشر دفعة واحدة
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Y Love S</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background: #09090e;
            color: #fff;
            font-family: 'Tajawal', sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 15px;
        }
        .brand-title {
            font-family: 'Cinzel', serif;
            font-size: 2.8rem;
            font-weight: 900;
            letter-spacing: 4px;
            background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 50%, #ffffff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 25px rgba(255, 117, 140, 0.4);
            margin-bottom: 20px;
            text-align: center;
            animation: pulseGlow 3s infinite alternate;
        }
        @keyframes pulseGlow {
            0% { filter: drop-shadow(0 0 10px rgba(255, 117, 140, 0.3)); }
            100% { filter: drop-shadow(0 0 25px rgba(255, 126, 179, 0.8)); }
        }
        .container {
            display: flex;
            width: 100%;
            max-width: 1300px;
            gap: 20px;
            flex: 1;
        }
        .video-box, .chat-box {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            border-radius: 20px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .video-box { flex: 2; }
        .chat-box { flex: 1; height: 75vh; }
        .input-group { display: flex; gap: 8px; }
        input {
            flex: 1;
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.15);
            color: #fff;
            padding: 12px;
            border-radius: 10px;
            outline: none;
            font-family: inherit;
        }
        button {
            background: linear-gradient(135deg, #ff758c, #ff7eb3);
            border: none;
            color: #fff;
            font-weight: bold;
            padding: 0 20px;
            border-radius: 10px;
            cursor: pointer;
            transition: 0.3s;
        }
        button:hover { opacity: 0.9; }
        video { width: 100%; border-radius: 12px; background: #000; max-height: 60vh; }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .msg {
            background: rgba(255,255,255,0.06);
            padding: 10px;
            border-radius: 10px;
            border-right: 3px solid #ff758c;
            font-size: 0.95rem;
            word-break: break-word;
        }
        @media (max-width: 850px) {
            .container { flex-direction: column; }
            .chat-box { height: 380px; }
            .brand-title { font-size: 2rem; }
        }
    </style>
</head>
<body>

    <h1 class="brand-title">Y Love S</h1>

    <div class="container">
        <div class="video-box">
            <div class="input-group">
                <input type="text" id="videoUrl" placeholder="ألصق رابط الفيديو المباشر (MP4)...">
                <button onclick="changeVideo()">تشغيل</button>
            </div>
            <video id="player" controls></video>
        </div>

        <div class="chat-box">
            <div class="chat-messages" id="messages"></div>
            <div class="input-group">
                <input type="text" id="msgInput" placeholder="اكتب رسالة..." onkeypress="if(event.key==='Enter') sendMsg()">
                <button onclick="sendMsg()">إرسال</button>
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        const player = document.getElementById('player');
        const messagesDiv = document.getElementById('messages');
        let isSyncing = false;

        socket.on('init', (data) => {
            data.messages.forEach(addMessage);
            if(data.videoState.url) player.src = data.videoState.url;
        });

        function changeVideo() {
            const url = document.getElementById('videoUrl').value;
            if(url) {
                player.src = url;
                socket.emit('videoAction', { url, currentTime: 0, isPlaying: false });
            }
        }

        player.onplay = () => { if(!isSyncing) socket.emit('videoAction', { currentTime: player.currentTime, isPlaying: true }); };
        player.onpause = () => { if(!isSyncing) socket.emit('videoAction', { currentTime: player.currentTime, isPlaying: false }); };
        player.onseeked = () => { if(!isSyncing) socket.emit('videoAction', { currentTime: player.currentTime, isPlaying: !player.paused }); };

        socket.on('videoAction', (data) => {
            isSyncing = true;
            if(data.url && player.src !== data.url) player.src = data.url;
            if(Math.abs(player.currentTime - data.currentTime) > 1) player.currentTime = data.currentTime;
            if(data.isPlaying) player.play(); else player.pause();
            setTimeout(() => isSyncing = false, 500);
        });

        function sendMsg() {
            const input = document.getElementById('msgInput');
            if(input.value.trim()) {
                socket.emit('sendMessage', input.value);
                input.value = '';
            }
        }

        socket.on('newMessage', (msg) => {
            addMessage(msg);
            while(messagesDiv.children.length > 30) messagesDiv.removeChild(messagesDiv.firstChild);
        });

        function addMessage(msg) {
            const div = document.createElement('div');
            div.className = 'msg';
            div.textContent = msg;
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    </script>
</body>
</html>
    `);
});

// إدارة الشات والمزامنة وحفظ 30 رسالة
io.on('connection', (socket) => {
    socket.emit('init', { messages, videoState: currentVideoState });

    socket.on('sendMessage', (msg) => {
        messages.push(msg);
        if (messages.length > 30) messages.shift();
        io.emit('newMessage', msg);
    });

    socket.on('videoAction', (data) => {
        currentVideoState = { ...currentVideoState, ...data };
        socket.broadcast.emit('videoAction', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
