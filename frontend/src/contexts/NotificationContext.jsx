import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const NotificationContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

// URL MANTIĞI: Dinamik Domain Desteği
const getWsBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    return `${protocol}${window.location.host}`; 
  }
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
  return backendUrl.replace(/^http/, "ws");
};

const BASE_WS_URL = getWsBaseUrl();
const NOTIFICATION_SOUND_ENABLED = true;

const getToastIcon = (type) => {
  switch (type) {
    case "success": return "✅";
    case "warning": return "⚠️";
    case "error": return "❌";
    default: return "🔔";
  }
};

const getToastStyle = (type) => {
  switch (type) {
    case "success":
      return { style: { background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" } };
    case "warning":
      return { style: { background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white" } };
    case "error":
      return { style: { background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "white" } };
    default:
      return { style: { background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", color: "white" } };
  }
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  
  const wsRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const audioRef = useRef(null);

  // Ses motorunu güvenli hale getirdik
  useEffect(() => {
    if (NOTIFICATION_SOUND_ENABLED) {
      audioRef.current = {
        play: () => {
          try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = "sine";

            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime); // Ses seviyesini biraz kıstık (0.1 -> 0.05)
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);

            // ÖNEMLİ: Bellek sızıntısını önlemek için AudioContext'i kapatıyoruz
            setTimeout(() => {
                if (audioContext.state !== 'closed') {
                    audioContext.close().catch(() => {});
                }
            }, 500);

          } catch (e) {
            // Tarayıcı izin vermezse (Autoplay Policy) sessizce hatayı yutuyoruz, konsolu kirletmiyoruz.
            // Kullanıcı sayfaya ilk tıkladığında sonraki bildirimlerde ses çalışacaktır.
          }
        }
      };
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${API_URL}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${API_URL}/notifications/unread-count`);
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [isAuthenticated]);

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const clearNewNotificationFlag = useCallback(() => {
    setHasNewNotification(false);
  }, []);

  const handleWebSocketMessage = useCallback((event) => {
    try {
      if (event.data === "pong") return;
      const data = JSON.parse(event.data);
      if (data.type === "notification") {
        const notification = data.data;
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        setHasNewNotification(true);
        setTimeout(() => setHasNewNotification(false), 3000);
        
        if (audioRef.current && NOTIFICATION_SOUND_ENABLED) {
            audioRef.current.play();
        }
        
        const icon = getToastIcon(notification.type);
        const toastOptions = getToastStyle(notification.type);
        toast(
          <div className="flex items-start gap-2">
            <span className="text-lg">{icon}</span>
            <div>
              <p className="font-semibold">{notification.title}</p>
              <p className="text-sm opacity-90">{notification.message}</p>
            </div>
          </div>,
          {
            duration: 5000,
            ...toastOptions,
            action: notification.link ? { label: "Görüntüle", onClick: () => window.location.href = notification.link } : undefined
          }
        );
      }
    } catch (error) {}
  }, []);

  // WebSocket Connection Logic
  useEffect(() => {
    let ws = null;
    let isActive = true;

    const cleanup = () => {
      isActive = false;
      if (ws) ws.close();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setConnectionStatus("disconnected");
    };

    if (!isAuthenticated || !token) {
      cleanup();
      return;
    }

    const connect = () => {
      if (!isActive) return;
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

      console.log(`🔄 Connecting to WebSocket... (${BASE_WS_URL}/api/ws/...)`);
      setConnectionStatus("connecting");

      try {
        ws = new WebSocket(`${BASE_WS_URL}/api/ws/${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isActive) { ws.close(); return; }
          console.log("🔗 WebSocket connected");
          setConnectionStatus("connected");

          if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send("ping");
          }, 25000);
        };

        ws.onmessage = handleWebSocketMessage;

        ws.onclose = (event) => {
          if (!isActive) return;
          console.log("🔌 WebSocket disconnected", event.code);
          setConnectionStatus("disconnected");
          wsRef.current = null;
          if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

          if (event.code !== 4001) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isActive) connect();
            }, 5000);
          }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            if (ws.readyState === WebSocket.OPEN) ws.close();
        };

      } catch (err) {
        console.error("WS Connection error:", err);
        setConnectionStatus("error");
        reconnectTimeoutRef.current = setTimeout(() => { if(isActive) connect(); }, 5000);
      }
    };

    connect();
    return cleanup;
  }, [isAuthenticated, token, handleWebSocketMessage]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

  // Chat message handlers - will be set by ChatContext
  const chatHandlersRef = useRef(null);

  const setChatMessageHandler = useCallback((handler) => {
    chatHandlersRef.current = handler;
  }, []);

  // Updated WebSocket message handler with chat support
  const handleWebSocketMessageWithChat = useCallback((event) => {
    try {
      if (event.data === "pong") return;
      const data = JSON.parse(event.data);
      
      // Handle notification
      if (data.type === "notification") {
        const notification = data.data;
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        setHasNewNotification(true);
        setTimeout(() => setHasNewNotification(false), 3000);
        
        if (audioRef.current && NOTIFICATION_SOUND_ENABLED) {
            audioRef.current.play();
        }
        
        const icon = getToastIcon(notification.type);
        const toastOptions = getToastStyle(notification.type);
        toast(
          <div className="flex items-start gap-2">
            <span className="text-lg">{icon}</span>
            <div>
              <p className="font-semibold">{notification.title}</p>
              <p className="text-sm opacity-90">{notification.message}</p>
            </div>
          </div>,
          {
            duration: 5000,
            ...toastOptions,
            action: notification.link ? { label: "Görüntüle", onClick: () => window.location.href = notification.link } : undefined
          }
        );
      }
      
      // Handle chat messages - forward to ChatContext
      if (chatHandlersRef.current && [
        "new_message", "message_edited", "message_deleted",
        "reaction_added", "reaction_removed", "typing",
        "participant_added", "participant_removed"
      ].includes(data.type)) {
        chatHandlersRef.current(data);
      }
    } catch (error) {}
  }, []);

  // Update the WebSocket onmessage handler
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.onmessage = handleWebSocketMessageWithChat;
    }
  }, [handleWebSocketMessageWithChat]);

  const value = {
    notifications,
    unreadCount,
    hasNewNotification,
    connectionStatus,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNewNotificationFlag,
    setChatMessageHandler,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};