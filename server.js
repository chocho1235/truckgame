const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static('.'));

const players = {};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Create a new player with random color
    players[socket.id] = {
        position: { x: 0, y: 1, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };

    // Send existing players to the new player
    socket.emit('currentPlayers', players);

    // Broadcast new player to all other players
    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        ...players[socket.id]
    });

    // Handle player movement updates
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].position = movementData.position;
            players[socket.id].rotation = movementData.rotation;
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                position: movementData.position,
                rotation: movementData.rotation
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Players can connect to: http://localhost:${PORT}`);
}); 