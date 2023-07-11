// client.js
const socket = io();
let localStream;
let userId; // Store the userId of the current participant
const peerConnections = {};
const sound = new Audio('audio.mp3');

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
socket.on('connect', () => {
    const roomId = getRoomIdFromUrl();
    userId = getCookie("userId");
    if (userId === undefined || userId.length < 2) {
        userId = generateUserId(); // Assign the userId
    }
    setCookie("userId", userId, 1);
    socket.emit('join-room', roomId, userId);
});

socket.on('existing-users', existingUsers => {
    existingUsers.forEach(existingUser => {
        const { userId, stream } = existingUser;
        console.warn(existingUser);
        addVideoStream(existingUser, stream);
        startPeerConnection(userId);
    });
});

socket.on('user-connected', user => {
    const { userId, stream } = user;
    console.log(`User ${userId} connected`);
    console.log(`User 51 ${user} connected`);

    if (user != undefined) {
        addVideoStream(user, stream);
        startPeerConnection(userId);
    }
    playSound();
});

socket.on('user-disconnected', userId => {
    console.log(`User ${userId} disconnected`);
    removeVideoStream(userId);
    if (peerConnections[userId]) {
        peerConnections[userId].close();
        delete peerConnections[userId];
    }

    playSound();
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
    const videoElement = document.createElement('video');
    videoElement.setAttribute('id', userId);
    videoElement.setAttribute('class', "video");
    videoElement.autoplay = true;

    console.warn("UID got " + userId + " :: in cookie " + getCookie("userId"));

    if (userId === getCookie("userId")) {
        videoElement.muted = true;
        videoElement.classList.add('my-video');
    } else {
        videoElement.classList.add('video-client');
    }



    if (stream) {
        videoElement.srcObject = stream;
    } else {
        // Display random images from Unsplash as a fallback
        const imageIndex = Math.floor(Math.random() * 10) + 1;
        videoElement.style.backgroundImage = `url('https://source.unsplash.com/random/400x300/?sig=${imageIndex}')`;
        videoElement.style.backgroundSize = 'cover';
    }
    videoContainer.appendChild(videoElement);
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