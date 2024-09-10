// App.js
import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3333', {
  transports: ['websocket'],
});

function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [roomId, setRoomId] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    socket.on('user-joined', (userId) => {
      console.log('Novo usuário entrou na sala:', userId);
      callUser();
    });

    socket.on('offer', async (offer) => {
      if (!peerConnectionRef.current) await createPeerConnection();
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socket.emit('answer', { roomId, answer });
    });

    socket.on('user-raised-hand', (userId) => {
      alert(`Usuário ${userId} levantou a mão!`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Cliente desconectado: ${socket.id}. Motivo: ${reason}`);
    });
    
    socket.on('answer', async (answer) => {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', async (candidate) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('chat-message', (data) => {
      setChatMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  const createPeerConnection = async () => {
    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.getTracks().forEach((track) => {
      peerConnectionRef.current.addTrack(track, localStream);
    });

    localVideoRef.current.srcObject = localStream;
  };

  const startCall = async () => {
    console.log(`Entrando na sala: ${roomId}`);
    setIsInCall(true);
    socket.emit('join-room', roomId);
    await createPeerConnection();
  };

  const callUser = async () => {
    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    socket.emit('offer', { roomId, offer });
  };

  const sendMessage = () => {
    if (chatMessage.trim() !== '') {
      socket.emit('chat-message', { roomId, message: chatMessage });
      setChatMessage('');
    }
  };

  const shareScreen = async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    screenStream.getTracks().forEach((track) => {
      peerConnectionRef.current.addTrack(track, screenStream);
    });
    localVideoRef.current.srcObject = screenStream;
  };
  

  return (
    <div className="App">
      <h1>Aplicação de Videoconferência</h1>
      <input
        type="text"
        placeholder="ID da sala"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <button onClick={startCall}>Entrar na Conferência</button>

      <div>
        <video ref={localVideoRef} autoPlay playsInline muted />
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>

      <div>
        <h2>Chat</h2>
        <input
          type="text"
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
        />
        <button onClick={sendMessage}>Enviar</button>
        <button onClick={shareScreen}>Compartilhar Tela</button>
        <button onClick={() => socket.emit('raise-hand', roomId)}>Levantar a Mão</button>
        <div>
          {chatMessages.map((msg, index) => (
            <p key={index}>
              <strong>{msg.userId}</strong>: {msg.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
