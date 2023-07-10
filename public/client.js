// client.js
const socket = io();
let localStream;

socket.on('connect', () => {
    const roomId = getRoomIdFromUrl();
    const userId = generateUserId();

    socket.emit('join-room', roomId, userId);
});

socket.on('user-connected', userId => {
    console.log(`User ${userId} connected`);
    addVideoStream(userId);
});

socket.on('user-disconnected', userId => {
    console.log(`User ${userId} disconnected`);
    removeVideoStream(userId);
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
    if(userId==="self") {
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
            localStream = stream;
            videoElement.srcObject = stream;
        })
        .catch(error => {
            console.error('Error accessing media devices:', error);
        });
}

function removeVideoStream(userId) {
    const videoElement = document.getElementById(userId);
    if (videoElement) {
        videoElement.srcObject.getTracks().forEach(track => {
            track.stop();
        });
        videoElement.srcObject = null;
        videoElement.remove();
    }
}

// Call addVideoStream to display the user's own video as the first stream
addVideoStream('self');
