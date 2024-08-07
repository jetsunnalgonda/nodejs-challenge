import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { WebSocketServer } from 'ws';
import { initializeWebSocketServer } from './websocket/websocketServer.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import userRoutes from './routes/userRoutes.js';
import likeRoutes from './routes/likeRoutes.js';
import { authenticateJWT } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
app.use('/auth', authRoutes);
app.use('/profile', authenticateJWT, profileRoutes);
app.use('/users', authenticateJWT, userRoutes);
app.use('/like', authenticateJWT, likeRoutes);

// Start WebSocket Server
initializeWebSocketServer(app);

// Start Express Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
