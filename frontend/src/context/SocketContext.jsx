import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/config';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
        const token = getToken();
        
        if (!token) {
            setSocket(null);
            setConnected(false);
            return;
        }

        console.log("Initializing shared WebSocket connection...");
        const newSocket = io(API_BASE_URL, {
            transports: ['polling', 'websocket'],
            auth: { token },
            reconnectionAttempts: 20,
            reconnectionDelay: 2000,
            timeout: 20000,
            withCredentials: true,
            forceNew: true
        });

        newSocket.on('connect', () => {
            console.log("✅ Shared WebSocket connected.");
            setConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log("❌ Shared WebSocket disconnected.");
            setConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.warn("⚠️ Shared WebSocket connection error:", err.message);
        });

        setSocket(newSocket);

        return () => {
            console.log("Cleaning up shared WebSocket...");
            newSocket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};
