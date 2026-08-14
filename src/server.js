import dotenv from 'dotenv';
dotenv.config();

import http from "http";
import app from './app.js';
import connectDB from './config/db.js';
import SocketManager from "./sockets/SocketManager.js";

const PORT = process.env.PORT || 5000;

await connectDB();

console.log('MONGO_URI:', process.env.MONGO_URI);

const server = http.createServer(app);
const socketManager = SocketManager.getInstance();
socketManager.initialize(server);

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
