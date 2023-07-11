// client.js
const socket = io();
let localStream;
const peerConnections = {};
socket.on('connect', () => {
    const roomId = getRoomIdFromUrl();
    const userId = generateUserId();

    socket.emit('join-room', roomId, userId);
});

socket.on('user-connected', userId => {
    console.log(`User ${userId} connected`);
    addVideoStream(userId);
    startPeerConnection(userId);
});

socket.on('user-disconnected', userId => {
    console.log(`User ${userId} disconnected`);
    removeVideoStream(userId);
    startPeerConnection(userId);
});

function getRoomIdFromUrl() {
    const url = window.location.href;
    const segments = url.split('/');
    return segments[segments.length - 1];
}

function generateUserId() {
    return Math.random().toString(36).substr(2, 9);
}

function addVideoStream(userId) {

    const videoContainer = document.getElementById('video-grid');
    const videoElement = document.createElement('video');
    videoElement.setAttribute('id', userId);
    videoElement.autoplay = true;
    if (userId === "self") {
        videoElement.setAttribute('class', 'video my-video');
        videoElement.muted = true;
    } else {
        videoElement.setAttribute('class', 'video-client');
        videoElement.muted = false;
    }




    videoContainer.appendChild(videoElement);

    navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then(stream => {
            // localStream = stream;
            // videoElement.srcObject = stream;
            if (stream) {
                videoElement.srcObject = stream;
            }
        })
        .catch(error => {
            console.error('Error accessing media devices:', error);
            // Display random images from Unsplash as a fallback
            const imageIndex = Math.floor(Math.random() * 10) + 1;
            videoElement.style.backgroundImage = `url('https://source.unsplash.com/random/1000x900/?sig=${imageIndex}')`;
            videoElement.style.backgroundSize = 'cover';
        });


}

socket.on('existing-users', existingUsers => {
    existingUsers.forEach(existingUser => {
        const { userId, stream } = existingUser;
        console.log(`Existing user ${existingUser} stream ` + stream)
        addVideoStream(existingUser, stream);
        startPeerConnection(userId);
    });
});

function startPeerConnection(userId) {
    const peerConnection = new RTCPeerConnection();

    localStream?.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = event => {
        const videoElement = document.getElementById(userId);
        if (!videoElement) {
            addVideoStream(userId, event.streams[0]);
        }
        videoElement.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', userId, event.candidate);
        }
    };

    peerConnections[userId] = peerConnection;

    // Create and send offer to the new participant
    peerConnection
        .createOffer()
        .then(offer => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit('offer', userId, peerConnection.localDescription);
        })
        .catch(error => {
            console.error('Error creating or sending offer:', error);
        });
}

function removeVideoStream(userId) {
    const videoElement = document.getElementById(userId);
    if (videoElement) {
        videoElement.srcObject?.getTracks().forEach(track => {
            track.stop();
        });
        videoElement.srcObject = null;
        videoElement.remove();
    }
}

// Call addVideoStream to display the user's own video as the first stream
addVideoStream('self');
