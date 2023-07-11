// client.js
const socket = io();
let localStream;
let userId;
const peerConnections = {};

// Audio elements for user connect and disconnect sounds
const connectSound = new Audio('sound.mp3');
const disconnectSound = new Audio('sound.mp3');

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localStream = stream;
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        if (videoTracks.length > 0) {
            console.log(`Using video device: ${videoTracks[0].label}`);
        }
        if (audioTracks.length > 0) {
            console.log(`Using audio device: ${audioTracks[0].label}`);
        }

        const roomId = getRoomIdFromUrl();
        userId = generateUserId();
        socket.emit('join-room', roomId, userId, stream);

        socket.on('existing-users', existingUsers => {
            existingUsers.forEach(existingUser => {
                const { userId, stream } = existingUser;
                addVideoStream(userId, stream);
                startPeerConnection(userId);
            });
        });

        socket.on('user-connected', user => {
            const { userId, stream } = user;
            console.log(`User ${userId} connected`);
            addVideoStream(userId, stream);
            startPeerConnection(userId);
            playSound(connectSound); // Play the connect sound
        });

        socket.on('user-disconnected', userId => {
            console.log(`User ${userId} disconnected`);
            removeVideoStream(userId);
            if (peerConnections[userId]) {
                peerConnections[userId].close();
                delete peerConnections[userId];
            }
            playSound(disconnectSound); // Play the disconnect sound
        });

        // Rest of the code...

    })
    .catch(error => {
        console.error('Error accessing media devices:', error);
    });

// Function to get the room ID from the URL
function getRoomIdFromUrl() {
    const url = window.location.href;
    const segments = url.split('/');
    return segments[segments.length - 1];
}

// Function to generate a random user ID
function generateUserId() {
    return Math.random().toString(36).substr(2, 9);
}

// Function to add a video stream to the UI
function addVideoStream(userId, stream) {
    const videoContainer = document.getElementById('video-grid');

    const videoElement = document.createElement('video');
    videoElement.setAttribute('id', userId);
    videoElement.autoplay = true;
    videoElement.srcObject = stream;
    console.log("Adding video : " + userId + " stream " + stream)
    videoContainer.appendChild(videoElement);
}

// Function to remove a video stream from the UI
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

// Function to start a peer connection
function startPeerConnection(userId) {
    const peerConnection = new RTCPeerConnection();

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = event => {
        const videoElement = document.getElementById(userId);
        if (videoElement) {
            videoElement.srcObject = event.streams[0];
        } else {
            addVideoStream(userId, event.streams[0]);
        }
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

// Function to play an audio sound
function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}

// Rest of the code...

