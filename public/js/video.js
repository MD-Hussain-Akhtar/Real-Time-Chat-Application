const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallBtn = document.getElementById('startCallBtn');
const endCallBtn = document.getElementById('endCallBtn');

let localStream;
let remoteStream;
let peerConnection;
let activeCallPartnerId = null;

const callRingtone = new Audio('audio/hussain.mp3');
callRingtone.loop = true;

const rtcConfig = { iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }] };

async function initMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: true } });
        localVideo.srcObject = localStream;
    } catch (e) { console.error(e); }
}
initMedia();

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = (e) => e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
    peerConnection.onicecandidate = (e) => {
        if (e.candidate && window.socket && activeCallPartnerId) {
            window.socket.emit('ice-candidate', { candidate: e.candidate, to: activeCallPartnerId });
        }
    };
}

startCallBtn.addEventListener('click', async () => {
    if (!window.selectedTargetId) return alert("❌ Pehle chat me us user ke name par click karein!");

    activeCallPartnerId = window.selectedTargetId;
    setupPeerConnection();
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    window.socket.emit('call_user', { offer: offer, to: activeCallPartnerId, callerName: window.myRealName });
    
    startCallBtn.innerText = "📲 Ringing...";
    startCallBtn.className = "bg-amber-600 text-white px-5 py-2.5 rounded-full font-medium text-sm animate-pulse";
});

if(window.socket) attachSocketListeners();
else setTimeout(() => { attachSocketListeners(); }, 1000);

function attachSocketListeners() {
    if(!window.socket) return;

    window.socket.on('incoming_call', async (data) => {
        activeCallPartnerId = data.from;
        document.getElementById('remoteNameTag').innerText = data.callerName;
        
        callRingtone.play().catch(() => {});
        startCallBtn.innerText = `🔔 ${data.callerName} Calling...`;
        startCallBtn.className = "bg-amber-500 text-white px-5 py-2.5 rounded-full font-bold text-sm animate-bounce";

        const confirmPick = confirm(`🔔 ${data.callerName} aapko video call kar rahe hain. Pick karein?`);
        if (confirmPick) {
            callRingtone.pause();
            setupPeerConnection();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            window.socket.emit('answer_call', { answer: answer, to: activeCallPartnerId });
            
            startCallBtn.innerText = "🟢 Connected";
            startCallBtn.className = "bg-zinc-800 text-emerald-400 px-5 py-2.5 rounded-full font-bold text-sm border border-emerald-500";
        } else {
            callRingtone.pause();
            window.socket.emit('reject_call', { to: activeCallPartnerId });
            window.location.reload();
        }
    });

    window.socket.on('call_accepted', async (data) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        startCallBtn.innerText = "🟢 Connected";
        startCallBtn.className = "bg-zinc-800 text-emerald-400 px-5 py-2.5 rounded-full font-bold text-sm border border-emerald-500";
    });

    window.socket.on('ice-candidate', async (data) => {
        if (peerConnection) { try { await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) {} }
    });

    window.socket.on('call_ended', () => { terminateCall(false); });
    window.socket.on('call_rejected', () => { alert("Call Cut/Rejected"); window.location.reload(); });
}

function terminateCall(notifyServer = true) {
    callRingtone.pause();
    if (peerConnection) peerConnection.close();
    if (notifyServer && window.socket && activeCallPartnerId) window.socket.emit('end_call', { to: activeCallPartnerId });
    window.location.reload(); 
}
endCallBtn.addEventListener('click', () => { terminateCall(true); });