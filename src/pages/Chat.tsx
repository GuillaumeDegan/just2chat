import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AppContext } from "../contexts/AppContext";
import { socket } from "../socket";

type Message = {
  id: string;
  message: string;
  senderId: string;
  timestamp: Date;
  reactions?: {
    type: MESSAGE_REACTIONS;
    senderId: string;
  }[];
};

enum MESSAGE_REACTIONS {
  LIKE = "LIKE",
  LAUGH = "LAUGH",
  WOW = "WOW",
  SAD = "SAD",
  ANGRY = "ANGRY",
  SOB = "SOB",
  VOMIT = "VOMIT",
}

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
    const messageId = uuidv4();
    socket.emit("send-message", {
      messageId,
      message: typedMessage,
      senderId: selectedUserId,
    });
    setMessageList((prevMessages) => [
      ...prevMessages,
      {
        id: messageId,
        message: typedMessage,
        senderId: selectedUserId || "unknown",
        timestamp: new Date(),
      },
    ]);
    setTypedMessage("");
  };

  const setReactionInMessage = (
    messageId: string,
    reaction: MESSAGE_REACTIONS,
    senderId: string
  ) => {
    setMessageList((prevMessages) =>
      prevMessages.map((message) => {
        if (message.id !== messageId) return message;

        const existingReactions = message.reactions || [];
        const existingReaction = existingReactions.find(
          (r) => r.senderId === senderId
        );

        let newReactions;
        if (existingReaction) {
          if (existingReaction.type === reaction) {
            // Same reaction: remove it (toggle off)
            newReactions = existingReactions.filter(
              (r) => r.senderId !== senderId
            );
          } else {
            // Different reaction: replace it
            newReactions = existingReactions.map((r) =>
              r.senderId === senderId ? { ...r, type: reaction } : r
            );
          }
        } else {
          // No existing reaction: add it
          newReactions = [...existingReactions, { type: reaction, senderId }];
        }

        return { ...message, reactions: newReactions };
      })
    );
  };

  const onReactToMessage = (messageId: string, reaction: MESSAGE_REACTIONS) => {
    socket.emit("react-to-message", {
      messageId,
      reaction,
      senderId: selectedUserId || "unknown",
    });
    setReactionInMessage(messageId, reaction, selectedUserId || "unknown");
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

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("user-connected", selectedUserId);
    setOnlineStatus((prev) => ({
      ...prev,
      [selectedUserId]: true,
    }));

    socket.on("users-status", (usersOnline: string[]) => {
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

    socket.on(
      "message-reacted",
      (data: {
        messageId: string;
        reaction: MESSAGE_REACTIONS;
        senderId: string;
      }) => {
        setReactionInMessage(data.messageId, data.reaction, data.senderId);
      }
    );

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
      socket.off("users-status");
      socket.off("user-typing");
      socket.off("user-stopped-typing");
      socket.off("message-reacted");
      socket.off("receive-message");
      socket.off("connect_error");
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
          <div
            key={message.id}
            style={{ backgroundColor: "black" }}
            onClick={() =>
              onReactToMessage(message.id, MESSAGE_REACTIONS.ANGRY)
            }
          >
            <p>
              <strong>{message.senderId}</strong>: {message.message}
            </p>
            <small>{message.timestamp.toLocaleTimeString()}</small>
            {message.reactions?.map((r, i) => (
              <p key={i}>
                {r.type} : {r.senderId}
              </p>
            ))}
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
