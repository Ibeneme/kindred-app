// src/context/SocketProvider.tsx
import { BASE_SOCKET } from "@/src/redux/services/config";
import React, { createContext, useContext, useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  const { user } = useSelector((state: RootState) => state.user);
  const userId = user?._id;

  useEffect(() => {
    if (!userId) return; // 🚨 Don't connect without logged in user

    const s = io(BASE_SOCKET, {
      transports: ["websocket"],
    });

    setSocket(s);

    // 🔥 Register user when connected
    s.on("connect", () => {
      console.log("✅ Socket connected:", s.id);
      s.emit("register_user", { userId });
    });

    // 🔁 If reconnect happens
    s.on("reconnect", () => {
      console.log("♻️ Socket reconnected");
      s.emit("register_user", { userId });
    });

    return () => {
      s.disconnect();
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
