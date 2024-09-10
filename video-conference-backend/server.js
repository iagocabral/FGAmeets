const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000, // Aumenta o tempo de inatividade antes de encerrar a conexão
});

io.on("connection", (socket) => {
  console.log("Novo cliente conectado:", socket.id);

  // Quando o cliente entra em uma sala
  socket.on("join-room", (roomId) => {
    console.log(`Cliente ${socket.id} entrou na sala ${roomId}`);
    socket.join(roomId); // Cliente entra na sala
    socket.to(roomId).emit("user-joined", socket.id); // Informa outros usuários na sala
  });

  // Enviar mensagem de chat para todos na sala
  socket.on("chat-message", (data) => {
    console.log(
      `Mensagem recebida de ${socket.id} na sala ${data.roomId}: ${data.message}`
    );

    // Enviar a mensagem para todos na sala, incluindo o userId do remetente
    io.to(data.roomId).emit("chat-message", {
      userId: socket.id, // Adiciona o ID do remetente
      message: data.message,
    });
  });

  // Evento de "levantar a mão"
  socket.on("raise-hand", (roomId) => {
    console.log(`Cliente ${socket.id} levantou a mão na sala ${roomId}`);
    io.to(roomId).emit("user-raised-hand", socket.id); // Informa todos na sala
  });

  // Oferta WebRTC (para estabelecer conexão de vídeo)
  socket.on("offer", (data) => {
    console.log(`Oferta recebida de ${socket.id} na sala ${data.roomId}`);
    socket.to(data.roomId).emit("offer", data.offer); // Envia a oferta para os outros na sala
  });

  // Resposta WebRTC (para continuar a conexão de vídeo)
  socket.on("answer", (data) => {
    console.log(`Resposta recebida de ${socket.id} na sala ${data.roomId}`);
    socket.to(data.roomId).emit("answer", data.answer); // Envia a resposta para o remetente da oferta
  });

  // Receber candidatos ICE (para otimizar a conexão WebRTC)
  socket.on("ice-candidate", (data) => {
    console.log(
      `ICE Candidate recebido de ${socket.id} na sala ${data.roomId}`
    );
    socket.to(data.roomId).emit("ice-candidate", data.candidate); // Envia candidatos ICE para os pares
  });

  // Desconexão do cliente
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

server.listen(3001, () => {
  console.log("Servidor ouvindo na porta 3001");
});
