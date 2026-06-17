window.socket = io();

const loginScreen = document.getElementById('loginScreen');
const usernameInput = document.getElementById('usernameInput');
const joinBtn = document.getElementById('joinBtn');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

window.myRealName = "";
window.selectedTargetId = null;

// 🚪 Login Execution
joinBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if(name === "") return alert("Pehle apna sahi naam daalein!");
    
    window.myRealName = name;
    document.getElementById('localNameTag').innerText = `${name} (You)`;
    
    // Server ko apna naam bhejna database entry ke liye
    window.socket.emit('join_room', { username: name });
    
    // Screen hide karna
    loginScreen.style.display = 'none';
});

function sendMessage() {
    const text = msgInput.value.trim();
    if (text !== "" && window.myRealName !== "") {
        window.socket.emit('chat_message', { text: text, user: window.myRealName });
        msgInput.value = '';
    }
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// 📚 Old History Loading from MongoDB
window.socket.on('load_history', (messages) => {
    chatMessages.innerHTML = ''; // Box empty karna
    messages.forEach(msg => {
        appendMessage(msg.username, msg.text, msg.username === window.myRealName);
    });
});

window.socket.on('chat_message', (data) => {
    const isMe = data.user === window.myRealName;
    appendMessage(data.user, data.text, isMe, data.senderId);
});

// Helper design template for bubbles
function appendMessage(user, text, isMe, senderId = null) {
    const messageElement = document.createElement('div');
    if (isMe) {
        messageElement.className = "bg-emerald-600 text-white p-3 rounded-xl rounded-tr-none max-w-[85%] text-sm shadow-md ml-auto text-right";
        messageElement.innerHTML = `<span class="block text-xs font-bold opacity-75 mb-1">You</span> ${text}`;
    } else {
        messageElement.className = "bg-zinc-800 text-zinc-300 p-3 rounded-xl rounded-tl-none max-w-[85%] text-sm shadow-md mr-auto cursor-pointer hover:border-emerald-500 border border-transparent transition-all";
        messageElement.innerHTML = `<span class="block text-xs font-bold text-emerald-400 mb-1">${user} (Click to Call 📞)</span> ${text}`;
        
        if(senderId) {
            messageElement.addEventListener('click', () => {
                window.selectedTargetId = senderId;
                document.getElementById('startCallBtn').innerText = `📞 Call ${user}`;
                alert(`🎯 Targeted Destination Fixed: ${user}`);
            });
        }
    }
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}