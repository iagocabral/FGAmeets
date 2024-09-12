var socketVideo, localVideo, remoteVideo, localStreamVideo, peerConnection, screenSender;

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
        const stream = event.streams[0];
        // Verifica se é a trilha de vídeo da câmera ou da tela
        if (stream.getVideoTracks().length > 0) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack.label.includes("screen")) {
                document.getElementById("remoteScreenVideo").srcObject = stream;
            } else {
                remoteVideo.srcObject = stream;
            }
        }
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

async function shareScreen() {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Adiciona a trilha de tela ao peerConnection
        screenSender = peerConnection.addTrack(screenTrack, screenStream);

        // Exibe a tela compartilhada localmente
        document.getElementById("screenvideo").srcObject = screenStream;

        // Adiciona a webcam de volta quando o compartilhamento de tela parar
        screenTrack.onended = async () => {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            cameraStream.getTracks().forEach(track => peerConnection.addTrack(track, cameraStream));
            document.getElementById("screenvideo").srcObject = null;
            document.getElementById("localVideo").srcObject = cameraStream;
        };
    } catch (error) {
        console.error('Erro ao compartilhar tela:', error);
    }
}