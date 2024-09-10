// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling']
  });

// server.js
io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);
  
    socket.on('join-room', (roomId) => {
        console.log(`Usuário ${socket.id} entrou na sala: ${roomId}`);
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);
      });

      socket.on('raise-hand', (roomId) => {
        console.log(`Evento de levantar a mão recebido de ${socket.id} na sala ${roomId}`);
        io.to(roomId).emit('user-raised-hand', socket.id);
      });
      
      socket.on('chat-message', (data) => {
        console.log(`Mensagem de chat recebida de ${socket.id} na sala ${data.roomId}: ${data.message}`);
        io.to(data.roomId).emit('chat-message', { userId: socket.id, message: data.message });
      });
  
    socket.on('offer', (data) => {
      socket.to(data.roomId).emit('offer', data.offer);
    });
  
    socket.on('answer', (data) => {
      socket.to(data.roomId).emit('answer', data.answer);
    });
  
    socket.on('ice-candidate', (data) => {
      socket.to(data.roomId).emit('ice-candidate', data.candidate);
    });
  
    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
  

server.listen(3333, () => {
  console.log('Servidor rodando na porta 3333');
});
