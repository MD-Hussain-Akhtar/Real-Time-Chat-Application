const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

// 🔌 1. MongoDB Atlas (Cloud) Connection String
// Aapka connection string jo aapne pehle likha tha:
const uri = "mongodb+srv://mhussainakhter:hussain123@hussain.78rwg7r.mongodb.net/studentDB?retryWrites=true&w=majority";

// Agar aap database ka naam 'studentDB' se badal kar 'chatApp' rakhna chahte hain, 
// toh uri me jahan /studentDB? likha hai use /chatApp? se replace kar sakte hain.

mongoose.connect(uri)
  .then(() => console.log("✔ Cloud MongoDB Atlas Connected Successfully!"))
  .catch(err => console.error("❌ MongoDB Cloud Connection Error:", err));

// 📝 2. Database Schemas
const userSchema = new mongoose.Schema({
    socketId: { type: String, required: true, unique: true },
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
        try {
            // User ko database me upsert (save/update) karna
            await User.findOneAndUpdate(
                { socketId: socket.id },
                { username: data.username },
                { upsert: true, new: true }
            );

            console.log(`✔ ${data.username} successfully registered in Cloud DB.`);

            // Purani chats cloud database se nikal kar naye user ko dikhana (History Load)
            const oldMessages = await Message.find().sort({ timestamp: 1 }).limit(50);
            socket.emit('load_history', oldMessages);

            // Sabhi ko batana ki naya user connect ho gaya hai aur online list update karna
            const allOnlineUsers = await User.find({}, 'socketId username');
            io.emit('update_users', allOnlineUsers);
        } catch (err) {
            console.error("Error in join_room:", err);
        }
    });

    // Text Chat Setup (Cloud Database me save karke bhejenge)
    socket.on('chat_message', async (data) => {
        try {
            // Message permanent cloud me save karna
            const newMsg = new Message({ username: data.user, text: data.text });
            await newMsg.save();

            io.emit('chat_message', { text: data.text, user: data.user, senderId: socket.id });
        } catch (err) {
            console.error("Error saving message to cloud:", err);
        }
    });

    // --- WebRTC Call Signaling (Same as before) ---
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

    // Disconnect listener
    socket.on('disconnect', async () => {
        try {
            await User.deleteOne({ socketId: socket.id });
            const allOnlineUsers = await User.find({}, 'socketId username');
            io.emit('update_users', allOnlineUsers); // Update online list for everyone
            
            console.log(`User disconnected: ${socket.id}`);
        } catch (err) {
            console.error("Error on disconnect:", err);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`WhatsApp Engine running on http://localhost:${PORT}`);
});