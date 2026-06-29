import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/config';
import { AUTH_SESSION_EVENT, getStoredAuthSession, clearStoredAuth } from '../utils/authStorage';

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
    const [authVersion, setAuthVersion] = useState(0);

    useEffect(() => {
        const { token } = getStoredAuthSession();
        
        if (!token) {
            if (socket) {
                socket.disconnect();
            }
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

        newSocket.on('auth_error', (data) => {
            console.error("Unauthorized socket connection:", data?.message);
            newSocket.disconnect();
            clearStoredAuth();
        });

        setSocket(newSocket);

        return () => {
            console.log("Cleaning up shared WebSocket...");
            newSocket.disconnect();
        };
    }, [authVersion]);

    useEffect(() => {
        const syncAuth = () => setAuthVersion((version) => version + 1);
        window.addEventListener(AUTH_SESSION_EVENT, syncAuth);
        window.addEventListener('storage', syncAuth);
        return () => {
            window.removeEventListener(AUTH_SESSION_EVENT, syncAuth);
            window.removeEventListener('storage', syncAuth);
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};
