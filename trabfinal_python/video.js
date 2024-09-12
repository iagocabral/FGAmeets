var socketVideo, localVideo, remoteVideo, localStreamVideo, peerConnection, screenSender;

// Outras funções relacionadas a vídeo...
async function inicializarWebRTC(isCaller, deviceId) {
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

function changeAudio() {
    if (!localStreamVideo) return;

    const audioTracks = localStreamVideo.getAudioTracks();
    if (audioTracks.length === 0) return;

    audioTracks[0].enabled = !audioTracks[0].enabled;

    const muteButton = document.getElementById("muteButton");
    if (audioTracks[0].enabled) {
        muteButton.textContent = "Mutar";
    } else {
        muteButton.textContent = "Desmutar";
    }
}

function changeCamera() {
    if (!localStreamVideo) return;

    const videoTracks = localStreamVideo.getVideoTracks();

    if (videoTracks.length === 0) return;

    videoTracks[0].enabled = !videoTracks[0].enabled;

    const toggleCameraButton =
        document.getElementById("toggleCameraButton");
    if (videoTracks[0].enabled) {
        toggleCameraButton.textContent = "Desligar Câmera";
    } else {
        toggleCameraButton.textContent = "Ligar Câmera";
    }
}

async function shareScreen() {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Substituir a trilha de vídeo atual pela trilha de tela
        const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
        sender.replaceTrack(screenTrack);

        // Mostrar a tela localmente
        localVideo.srcObject = screenStream;

        // Quando o usuário parar de compartilhar a tela, restaurar a webcam
        screenTrack.onended = async () => {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];
            sender.replaceTrack(cameraTrack);
            localVideo.srcObject = cameraStream;
        };
    } catch (error) {
        console.error('Erro ao compartilhar tela:', error);
    }
}
  
  function stopSharingScreen() {
    // Reinicia a webcam após o compartilhamento de tela terminar
    selectCamera();
  }