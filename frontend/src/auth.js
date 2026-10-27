import { useChatStore } from "./pages/chat/chatStore";

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  useChatStore.getState().reset();
}