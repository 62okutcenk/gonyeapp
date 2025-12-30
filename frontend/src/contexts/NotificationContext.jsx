import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const NotificationContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";
const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace("https://", "wss://").replace("http://", "ws://");

// Notification sound (optional - can be enabled/disabled)
const NOTIFICATION_SOUND_ENABLED = true;

// Toast icons based on notification type
const getToastIcon = (type) => {
  switch (type) {
    case "success":
      return "✅";
    case "warning":
      return "⚠️";
    case "error":
      return "❌";
    default:
      return "🔔";
  }
};

// Toast style based on notification type
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
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize audio for notification sound
  useEffect(() => {
    if (NOTIFICATION_SOUND_ENABLED) {
      // Create a simple beep using Web Audio API
      audioRef.current = {
        play: () => {
          try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = "sine";
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
          } catch (e) {
            // Audio not supported or blocked
          }
        }
      };
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axios.get(`${API_URL}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [isAuthenticated]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axios.get(`${API_URL}/notifications/unread-count`);
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [isAuthenticated]);

  // Mark notification as read
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

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // Clear new notification flag (for animation reset)
  const clearNewNotificationFlag = useCallback(() => {
    setHasNewNotification(false);
  }, []);

  // Handle incoming WebSocket message
  const handleWebSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "notification") {
        const notification = data.data;
        
        // Add to notifications list
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        // Trigger animation flag
        setHasNewNotification(true);
        
        // Auto-clear animation flag after 3 seconds
        setTimeout(() => {
          setHasNewNotification(false);
        }, 3000);
        
        // Play notification sound
        if (audioRef.current && NOTIFICATION_SOUND_ENABLED) {
          audioRef.current.play();
        }
        
        // Show toast notification with custom styling
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
            action: notification.link ? {
              label: "Görüntüle",
              onClick: () => window.location.href = notification.link
            } : undefined
          }
        );
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }, []);

  // WebSocket connection with auto-reconnect
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Close existing connection if not authenticated
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    const connectWebSocket = () => {
      // Don't connect if already connected or connecting
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        const websocket = new WebSocket(`${WS_URL}/ws/${token}`);

        websocket.onopen = () => {
          console.log("🔗 WebSocket connected");
        };

        websocket.onmessage = handleWebSocketMessage;

        websocket.onclose = (event) => {
          console.log("🔌 WebSocket disconnected", event.code);
          wsRef.current = null;
          
          // Auto-reconnect after 3 seconds (only if still authenticated)
          if (isAuthenticated && token) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log("🔄 Attempting WebSocket reconnection...");
              connectWebSocket();
            }, 3000);
          }
        };

        websocket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        wsRef.current = websocket;
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
        // Retry connection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, token, handleWebSocketMessage]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    hasNewNotification,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNewNotificationFlag,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
