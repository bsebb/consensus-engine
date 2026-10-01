require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { searchRestaurants, fetchFoursquarePlaces } = require('./src/utils/foursquarePlaces');
const roomRoutes = require('./routes/roomRoutes');
const { setIO } = require('./src/utils/socket');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/rooms', roomRoutes);

app.get('/api/v1/test-foursquare', async (req, res) => {
    try {
        const restaurants = await searchRestaurants({
            latitude: 47.0105,
            longitude: 28.8638,
            radius: 5000,
        });
        res.json({ success: true, count: restaurants.length, restaurants });
    } catch (error) {
        console.error('Foursquare error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.use((err, req, res, next) => {
    console.error(`[Error]: ${err.message}`);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
        success: false,
        error: err.name || 'SERVER_ERROR',
        message: err.message || 'An unexpected error occurred.',
    });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: { origin: '*' },
});
setIO(io);

// ── Socket.io handlers ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ── join_lobby ────────────────────────────────────────────────────────────
    socket.on('join_lobby', async (data) => {
        try {
            const { pin, participant_id, user_name } = data;

            if (!pin || !participant_id) {
                socket.emit('room_error', { message: 'pin and participant_id are required.' });
                return;
            }

            socket.data.pin = pin;
            socket.data.participantId = participant_id;
            socket.data.userName = user_name || 'Guest';

            // Join the socket room
            socket.join(pin);

            const {
                getRoomByPin,
                createRoom,
                createParticipantWithId,
            } = require('./db/helpers');

            let room;
            try {
                room = await getRoomByPin(pin);
            } catch (err) {
                // Room doesn't exist yet - auto-create it for offline/demo sessions
                console.log(`[Socket] Auto-creating room ${pin} for participant ${participant_id}`);
                room = await createRoom(participant_id, pin);
            }

            // Register participant if not already in room
            const alreadyIn = room.participants.some(p => p.id === participant_id);
            if (!alreadyIn) {
                await createParticipantWithId(room.id, participant_id);
                // Re-hydrate
                room = await getRoomByPin(pin);
            }

            // Broadcast updated participant list to everyone in the room
            const participantList = room.participants.map(p => ({
                id: p.id,
                name: p.id === participant_id ? (user_name || 'Guest') : 'Peer',
                isHost: p.id === room.hostId,
                budgetSealed: p.budgetCap != null,
            }));

            io.to(pin).emit('participant_joined', {
                pin,
                participants: participantList,
                host_id: room.hostId,
                user_name,
                participant_id,
            });

            console.log(`[Socket] ${user_name || 'Guest'} joined room ${pin}`);
        } catch (error) {
            console.error('[Socket] join_lobby error:', error.message);
            socket.emit('room_error', { message: 'Failed to join room.' });
        }
    });

    // ── host_start_voting ─────────────────────────────────────────────────────
    socket.on('host_start_voting', async (data) => {
        try {
            const { pin, host_id, options } = data;

            if (!pin || !host_id || !Array.isArray(options)) {
                socket.emit('room_error', { message: 'pin, host_id and options are required.' });
                return;
            }

            const { getRoomByPin, createOption } = require('./db/helpers');

            let room;
            try {
                room = await getRoomByPin(pin);
            } catch (err) {
                socket.emit('room_error', { message: 'Room not found.' });
                return;
            }

            // Verify host
            if (room.hostId !== host_id) {
                socket.emit('room_error', { message: 'Only the room host can start voting.' });
                return;
            }

            // Persist options if they're just strings (custom mode)
            let roomOptions = options;
            if (options.length > 0 && options.every(o => typeof o === 'string')) {
                roomOptions = [];
                for (const optionName of options) {
                    const option = await createOption(room.id, optionName, 'USER_CUSTOM', null, null);
                    roomOptions.push({ id: option.id, name: option.name });
                }
            } else if (options.length > 0 && options.every(o => typeof o === 'object' && o.name)) {
                // Objects with name/id - persist if no id yet
                roomOptions = [];
                for (const opt of options) {
                    if (opt.id) {
                        roomOptions.push({ id: opt.id, name: opt.name });
                    } else {
                        const option = await createOption(room.id, opt.name, 'USER_CUSTOM', opt.googlePlaceId || null, opt.priceLevel || null);
                        roomOptions.push({ id: option.id, name: option.name, priceLevel: option.priceLevel });
                    }
                }
            }

            io.to(pin).emit('voting_started', { pin, options: roomOptions });
            console.log(`[Socket] Voting started in room ${pin} with ${roomOptions.length} options`);
        } catch (error) {
            console.error('[Socket] Failed to start voting:', error.message);
            socket.emit('room_error', { message: 'Failed to start voting.' });
        }
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        const pin = socket.data.pin;
        const participantId = socket.data.participantId;
        const userName = socket.data.userName || 'Guest';

        if (!pin) return;

        const totalParticipants = io.sockets.adapter.rooms.get(pin)?.size || 0;

        io.to(pin).emit('participant_left', {
            pin,
            participant_id: participantId,
            user_name: userName,
            total_participants: totalParticipants,
        });

        console.log(`[Socket] ${userName} left room ${pin}`);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
