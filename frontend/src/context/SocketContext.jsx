
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import io from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketContextProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const { user, isLoaded } = useUser();

    useEffect(() => {
        if (isLoaded && user) {
            const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
            const socketInstance = io(baseURL, {
                query: {
                    userId: user.id
                }
            });

            setSocket(socketInstance);

            socketInstance.on("onlineUsers", (users) => {
                setOnlineUsers(users);
            });

            // Request current online users after connection
            socketInstance.on("connect", () => {
                socketInstance.emit("getOnlineUsers");
            });

            return () => socketInstance.close();
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [user, isLoaded]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
