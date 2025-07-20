import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { AppContext } from "../contexts/AppContext";

type Message = {
  id: string;
  message: string;
  senderId: string;
  timestamp: Date;
};

const socket = io("http://localhost:3001");

function Chat() {
  const { selectedUserId } = useContext(AppContext);
  const navigate = useNavigate();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [typedMessage, setTypedMessage] = useState("");
  const [otherUserIsTyping, setOtherUserIsTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<{
    user1: boolean;
    user2: boolean;
  }>({ user1: false, user2: false });
  const [messageList, setMessageList] = useState<Message[]>([]);

  const onSendMessage = () => {
    console.log("📤 Envoi du message :", typedMessage);

    socket.emit("send-message", {
      message: typedMessage,
      senderId: selectedUserId,
    });
    setMessageList((prevMessages) => [
      ...prevMessages,
      {
        id: Date.now().toString(),
        message: typedMessage,
        senderId: selectedUserId || "unknown",
        timestamp: new Date(),
      },
    ]);
    setTypedMessage("");
  };

  const onGoBack = () => {
    socket.emit("user-disconnected", selectedUserId);
    navigate("/");
  };

  useEffect(() => {
    if (!selectedUserId) return;

    if (typedMessage.trim() !== "") {
      socket.emit("typing", selectedUserId);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", selectedUserId);
      }, 3000);
    } else {
      socket.emit("stop-typing", selectedUserId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [typedMessage]);

  useEffect(() => {
    if (!selectedUserId) {
      navigate("/");
      return;
    }

    socket.emit("user-connected", selectedUserId);
    setOnlineStatus((prev) => ({
      ...prev,
      [selectedUserId]: true,
    }));

    socket.on("users-status", (usersOnline: string[]) => {
      console.log("users-status", usersOnline);
      setOnlineStatus({
        user1: usersOnline.includes("user1"),
        user2: usersOnline.includes("user2"),
      });
    });

    socket.on("user-typing", (userId: string) => {
      if (userId === selectedUserId) {
        return;
      } else {
        setOtherUserIsTyping(true);
      }
    });

    socket.on("user-stopped-typing", (userId: string) => {
      if (userId === selectedUserId) {
        return;
      } else {
        setOtherUserIsTyping(false);
      }
    });

    socket.on("receive-message", (data: Message) => {
      setMessageList((prevMessages) => [
        ...prevMessages,
        {
          id: data.id,
          message: data.message,
          senderId: data.senderId,
          timestamp: new Date(),
        },
      ]);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Erreur de socket :", err.message);
    });

    return () => {
      // Clean listeners
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.off("user-status");
      socket.off("receive-message");
      socket.off("users-status");
    };
  }, []);

  return (
    <>
      <h1>Chat</h1>
      <h3>{selectedUserId}</h3>
      <p>status user1 : {onlineStatus.user1 ? "connecté" : "déconnecté"}</p>
      <p>status user2 : {onlineStatus.user2 ? "connecté" : "déconnecté"}</p>
      <button onClick={onGoBack}>Retour</button>
      <div style={{ gap: 4 }}>
        {messageList.map((message) => (
          <div key={message.id} style={{ backgroundColor: "black" }}>
            <p>
              <strong>{message.senderId}</strong>: {message.message}
            </p>
            <small>{message.timestamp.toLocaleTimeString()}</small>
          </div>
        ))}
      </div>
      {otherUserIsTyping && <p>L'autre utilisateur est en train d'écrire...</p>}
      <input
        type="text"
        placeholder="Type your message here..."
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSendMessage();
          }
        }}
        value={typedMessage}
        onChange={(t) => setTypedMessage(t.target.value)}
      />
      <button type="button" onClick={onSendMessage}>
        Envoyer
      </button>
    </>
  );
}

export default Chat;
