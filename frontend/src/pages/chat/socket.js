import { io } from "socket.io-client";
import { getToken } from "./api";

const BASE = import.meta.env.VITE_API_URL || undefined;
let socket = null;

export function connectSocket() {
  if (!socket) socket = io(BASE, { auth: { token: getToken() } });
  return socket;
}
export const getSocket = () => socket;
export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}