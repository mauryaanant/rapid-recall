const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 1. Try to serve from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// 2. FOOLPROOF FALLBACK: If GitHub placed index.html in the main folder, use this route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let rooms = {};

io.on('connection', (socket) => {
    socket.on('createRoom', ({ roomId, rounds, maxPlayers, username, avatar }) => {
        rooms[roomId] = {
            host: socket.id,
            players: {},
            usedWords: new Set(),
            maxRounds: parseInt(rounds),
            playerLimit: parseInt(maxPlayers),
            currentRound: 1,
            submissions: [],
            votesExpected: 0,
            votesReceived: 0,
            roundWords: []
        };
        join(socket, roomId, username, avatar);
    });

    socket.on('joinRoom', ({ roomId, username, avatar }) => {
        if (rooms[roomId] && Object.keys(rooms[roomId].players).length < rooms[roomId].playerLimit) {
            join(socket, roomId, username, avatar);
        } else {
            socket.emit('err', 'ROOM FULL OR OFFLINE');
        }
    });

    function join(s, rid, name, av) {
        s.join(rid);
        s.roomId = rid;
        rooms[rid].players[s.id] = { id: s.id, name, avatar: av, score: 0, ready: false };
        io.to(rid).emit('updatePlayers', Object.values(rooms[rid].players));
    }

    socket.on('playerReady', () => {
        const room = rooms[socket.roomId];
        if (!room) return;
        room.players[socket.id].ready = true;
        const players = Object.values(room.players);
        io.to(socket.roomId).emit('updatePlayers', players);

        if (players.length === room.playerLimit && players.every(p => p.ready)) {
            if(room.currentRound > room.maxRounds) {
                io.to(socket.roomId).emit('gameOver', players.sort((a,b) => b.score - a.score));
                delete rooms[socket.roomId]; 
                return;
            }
            
            room.submissions = [];
            room.roundWords = [];
            room.votesReceived = 0;
            room.votesExpected = 0;
            
            const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
            room.currentLetter = letter;
            
            io.to(socket.roomId).emit('showRules', { letter, round: room.currentRound });
            setTimeout(() => io.to(socket.roomId).emit('beginInput'), 5000);
        }
    });

    socket.on('submitAnswers', ({ answers, timeUsed }) => {
        const room = rooms[socket.roomId];
        if (!room) return;

        let isComplete = answers && Object.values(answers).every(v => v.trim() !== "");
        let points = 0;

        if (isComplete) {
            const entries = Object.values(answers).map(v => v.toLowerCase().trim());
            
            if (entries.some(word => room.usedWords.has(word))) {
                socket.emit('err', 'ARCHIVE COLLISION: Word previously used in this game.');
                isComplete = false; 
            } else {
                entries.forEach(w => room.roundWords.push(w)); 
                points = Math.max(0, 100 - Math.floor(timeUsed * 1.5));
            }
        }

        room.submissions.push({ 
            from: socket.id, 
            playerName: room.players[socket.id].name, 
            answers: isComplete ? answers : null, 
            points: isComplete ? points : 0 
        });

        if (room.submissions.length === room.playerLimit) {
            const validSubmissions = room.submissions.filter(s => s.answers !== null);
            room.votesExpected = validSubmissions.length * (room.playerLimit - 1);
            
            if (room.votesExpected === 0) {
                room.currentRound++;
                Object.values(room.players).forEach(p => p.ready = false);
                io.to(socket.roomId).emit('updatePlayers', Object.values(room.players));
                io.to(socket.roomId).emit('roundEnded');
            } else {
                io.to(socket.roomId).emit('startVotingPhase', validSubmissions);
            }
        }
    });

    socket.on('voteResult', ({ targetId, vote, points }) => {
        const room = rooms[socket.roomId];
        if (!room) return;
        
        if (vote === 'yes' && room.players[targetId]) {
            room.players[targetId].score += points;
            io.to(targetId).emit('voteFeedback', { status: 'approved', points });
        } else if (vote === 'no') {
            io.to(targetId).emit('voteFeedback', { status: 'rejected', points: 0 });
        }

        room.votesReceived++;
        
        if (room.votesReceived >= room.votesExpected) {
            room.roundWords.forEach(w => room.usedWords.add(w)); 
            room.currentRound++;
            Object.values(room.players).forEach(p => p.ready = false);
            io.to(socket.roomId).emit('updatePlayers', Object.values(room.players));
            io.to(socket.roomId).emit('roundEnded');
        }
    });
});

// 3. FOOLPROOF PORT: Use Render's environment port if available
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`System Online on port ${PORT}`));
