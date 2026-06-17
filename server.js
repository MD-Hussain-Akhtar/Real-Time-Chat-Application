const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// 🔌 1. MongoDB Connection (chatApp database automatic ban jayega)
mongoose.connect('mongodb://localhost:27017/chatApp')
  .then(() => console.log("✔ MongoDB Connected Successfully!"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 📝 2. Database Schemas (History aur User details permanent rakhne ke liye)
const userSchema = new mongoose.Schema({
    socketId: String,
    username: String,
    loginTime: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
    username: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);


// 🔄 3. Socket.io Control Room
io.on('connection', (socket) => {
    console.log(`New connection attempt: ${socket.id}`);

    // Jab koi user apna Naam submit karega
    socket.on('join_room', async (data) => {
        // User ko database me register karna
        const newUser = new User({ socketId: socket.id, username: data.username });
        await newUser.save();

        console.log(`✔ ${data.username} successfully registered in DB.`);

        // Purani chats database se nikal kar naye user ko dikhana (History Load)
        const oldMessages = await Message.find().sort({ timestamp: 1 }).limit(50);
        socket.emit('load_history', oldMessages);

        // Sabhi ko batana ki naya user connect ho gaya hai aur online list update karna
        const allOnlineUsers = await User.find({}, 'socketId username');
        io.emit('update_users', allOnlineUsers);
    });

    // Text Chat Setup (Database me save karke bhejenge)
    socket.on('chat_message', async (data) => {
        // Message permanent save karna
        const newMsg = new Message({ username: data.user, text: data.text });
        await newMsg.save();

        io.emit('chat_message', { text: data.text, user: data.user, senderId: socket.id });
    });

    // --- PRIVATE VIDEO CALL ROUTERS (ByName Integration) ---
    socket.on('call_user', (data) => {
        io.to(data.to).emit('incoming_call', { offer: data.offer, from: socket.id, callerName: data.callerName });
    });

    socket.on('answer_call', (data) => {
        io.to(data.to).emit('call_accepted', { answer: data.answer });
    });

    socket.on('ice-candidate', (data) => {
        io.to(data.to).emit('ice-candidate', { candidate: data.candidate });
    });

    socket.on('reject_call', (data) => {
        io.to(data.to).emit('call_rejected');
    });

    socket.on('end_call', (data) => {
        io.to(data.to).emit('call_ended');
    });

    // Jab koi app band karega toh database se uska naam hatao
    socket.on('disconnect', async () => {
        await User.deleteOne({ socketId: socket.id });
        const allOnlineUsers = await User.find({}, 'socketId username');
        io.emit('update_users', allOnlineUsers); // Update online list for everyone
        io.emit('call_ended');
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(3000, () => {
    console.log(`WhatsApp Engine running on http://localhost:3000`);
});