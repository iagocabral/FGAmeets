var socketVideo, localVideo, remoteVideo, localStreamVideo, peerConnection;

// Outras funções relacionadas a vídeo...
async function startWebRTC(isCaller, deviceId) {
    localVideo = document.getElementById("localVideo");
    remoteVideo = document.getElementById("remoteVideo");

    localStreamVideo = await navigator.mediaDevices.getUserMedia({
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
        },
        audio: true,
    });
    localVideo.srcObject = localStreamVideo;

    peerConnection = new RTCPeerConnection();

    localStreamVideo.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamVideo);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socketVideo.send(
                JSON.stringify({ ice: event.candidate })
            );
        }
    };

    if (isCaller) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socketVideo.send(JSON.stringify({ offer: offer }));
    }
    document.getElementById("chatVideo").style.display = "block";
}

async function selectCamera() {
    if (localStreamVideo) {
        localStreamVideo
            .getTracks()
            .forEach((track) => track.stop());
    }
    const cameraId = document.getElementById("cameraSelect").value;
    localStreamVideo = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cameraId } },
        audio: true,
    });
    localVideo.srcObject = localStreamVideo;

    // Atualizar as trilhas no peerConnection
    const senders = peerConnection.getSenders();
    localStreamVideo.getTracks().forEach((track) => {
        const sender = senders.find(
            (s) => s.track.kind === track.kind
        );
        if (sender) {
            sender.replaceTrack(track);
        }
    });
}

