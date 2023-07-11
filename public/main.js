// client.js
const socket = io();
let localStream;
let userId;
const peerConnections = {};

// Audio elements for user connect and disconnect sounds
const sound = new Audio('sound.mp3');

socket.on('connect', () => {
    const roomId = getRoomIdFromUrl();
    userId = generateUserId();

    socket.emit('join-room', roomId, userId);
});

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

function getRoomIdFromUrl() {
    const url = window.location.href;
    const segments = url.split('/');
    return segments[segments.length - 1];
}

function generateUserId() {
    return Math.random().toString(36).substr(2, 9);
}

function addVideoStream(userId, stream) {
    const videoContainer = document.getElementById('video-grid');

    // Create a video element for the remote user
    const remoteVideoElement = document.createElement('video');
    remoteVideoElement.setAttribute('id', userId);
    remoteVideoElement.autoplay = true;
    remoteVideoElement.classList.add('remote-video');

    videoContainer.appendChild(remoteVideoElement);

    // Display the local video stream in a separate video element
    if (userId === userId) {
        const localVideoElement = document.createElement('video');
        localVideoElement.setAttribute('id', 'self');
        localVideoElement.autoplay = true;
        localVideoElement.muted = true;
        localVideoElement.classList.add('self-video');

        videoContainer.appendChild(localVideoElement);

        localVideoElement.srcObject = stream;
    } else {
        remoteVideoElement.srcObject = stream;
    }
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

socket.on('offer', (userId, offer) => {
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

    peerConnection
        .setRemoteDescription(offer)
        .then(() => {
            return peerConnection.createAnswer();
        })
        .then(answer => {
            return peerConnection.setLocalDescription(answer);
        })
        .then(() => {
            socket.emit('answer', userId, peerConnection.localDescription);
        })
        .catch(error => {
            console.error('Error creating or sending answer:', error);
        });

    peerConnections[userId] = peerConnection;
});

socket.on('answer', (userId, answer) => {
    const peerConnection = peerConnections[userId];
    if (peerConnection) {
        peerConnection
            .setRemoteDescription(answer)
            .catch(error => {
                console.error('Error setting remote description:', error);
            });
    }
});

socket.on('ice-candidate', (userId, iceCandidate) => {
    const peerConnection = peerConnections[userId];
    if (peerConnection) {
        peerConnection
            .addIceCandidate(new RTCIceCandidate(iceCandidate))
            .catch(error => {
                console.error('Error adding ICE candidate:', error);
            });
    }
});

function playSound() {
    sound.currentTime = 0;
    sound.play();
}