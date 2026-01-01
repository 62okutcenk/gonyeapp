import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const ChatContext = createContext(null);
const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const getWsBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    return `${protocol}${window.location.host}`;
  }
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
  return backendUrl.replace(/^http/, "ws");
};

const BASE_WS_URL = getWsBaseUrl();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { token, isAuthenticated, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Get auth headers
  const getHeaders = useCallback(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    setLoadingConversations(true);
    try {
      const response = await axios.get(`${API_URL}/chat/conversations`, getHeaders());
      setConversations(response.data);
      setTotalUnreadCount(response.data.reduce((sum, c) => sum + (c.unread_count || 0), 0));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  }, [token, getHeaders]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId, before = null) => {
    if (!token || !conversationId) return;
    setLoadingMessages(true);
    try {
      let url = `${API_URL}/chat/conversations/${conversationId}/messages?limit=50`;
      if (before) url += `&before=${before}`;
      const response = await axios.get(url, getHeaders());
      setMessages(prev => before ? [...response.data, ...prev] : response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [token, getHeaders]);

  // Send message
  const sendMessage = useCallback(async (conversationId, content, options = {}) => {
    if (!token || !content.trim()) return null;
    try {
      const payload = {
        content: content.trim(),
        type: options.type || "text",
        reply_to_id: options.replyToId || null,
        mentions: options.mentions || [],
        links: options.links || [],
        file_id: options.fileId || null
      };
      const response = await axios.post(
        `${API_URL}/chat/conversations/${conversationId}/messages`,
        payload,
        getHeaders()
      );
      setMessages(prev => [...prev, response.data]);
      fetchConversations();
      return response.data;
    } catch (error) {
      toast.error("Mesaj gönderilemedi");
      console.error("Error sending message:", error);
      return null;
    }
  }, [token, getHeaders, fetchConversations]);

  // Edit message
  const editMessage = useCallback(async (messageId, newContent) => {
    if (!token) return false;
    try {
      const response = await axios.put(
        `${API_URL}/chat/messages/${messageId}`,
        { content: newContent },
        getHeaders()
      );
      setMessages(prev => prev.map(m => m.id === messageId ? response.data : m));
      return true;
    } catch (error) {
      const detail = error.response?.data?.detail || "Mesaj düzenlenemedi";
      toast.error(detail);
      return false;
    }
  }, [token, getHeaders]);

  // Delete message
  const deleteMessage = useCallback(async (messageId) => {
    if (!token) return false;
    try {
      await axios.delete(`${API_URL}/chat/messages/${messageId}`, getHeaders());
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, is_deleted: true, content: "Bu mesaj silindi." } : m
      ));
      return true;
    } catch (error) {
      const detail = error.response?.data?.detail || "Mesaj silinemedi";
      toast.error(detail);
      return false;
    }
  }, [token, getHeaders]);

  // Add reaction
  const addReaction = useCallback(async (messageId, emoji) => {
    if (!token) return false;
    try {
      const response = await axios.post(
        `${API_URL}/chat/messages/${messageId}/reactions`,
        { emoji },
        getHeaders()
      );
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, reactions: [...(m.reactions || []), response.data] };
        }
        return m;
      }));
      return true;
    } catch (error) {
      console.error("Error adding reaction:", error);
      return false;
    }
  }, [token, getHeaders]);

  // Remove reaction
  const removeReaction = useCallback(async (messageId, emoji) => {
    if (!token) return false;
    try {
      await axios.delete(
        `${API_URL}/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
        getHeaders()
      );
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            reactions: (m.reactions || []).filter(
              r => !(r.user_id === user?.id && r.emoji === emoji)
            )
          };
        }
        return m;
      }));
      return true;
    } catch (error) {
      console.error("Error removing reaction:", error);
      return false;
    }
  }, [token, getHeaders, user]);

  // Create conversation
  const createConversation = useCallback(async (type, participantIds, name = null) => {
    if (!token) return null;
    try {
      const payload = {
        type,
        participant_ids: participantIds,
        name
      };
      const response = await axios.post(
        `${API_URL}/chat/conversations`,
        payload,
        getHeaders()
      );
      await fetchConversations();
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Sohbet oluşturulamadı");
      return null;
    }
  }, [token, getHeaders, fetchConversations]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (conversationId, isTyping) => {
    if (!token || !conversationId) return;
    try {
      await axios.post(
        `${API_URL}/chat/conversations/${conversationId}/typing?is_typing=${isTyping}`,
        {},
        getHeaders()
      );
    } catch (error) {
      // Ignore errors
    }
  }, [token, getHeaders]);

  // Search users for @mention
  const searchUsers = useCallback(async (query) => {
    if (!token || !query) return [];
    try {
      const response = await axios.get(
        `${API_URL}/chat/search/users?q=${encodeURIComponent(query)}`,
        getHeaders()
      );
      return response.data;
    } catch (error) {
      return [];
    }
  }, [token, getHeaders]);

  // Search resources for link
  const searchResources = useCallback(async (query, type = null) => {
    if (!token || !query) return { projects: [], customers: [], tasks: [] };
    try {
      let url = `${API_URL}/chat/search/resources?q=${encodeURIComponent(query)}`;
      if (type) url += `&type=${type}`;
      const response = await axios.get(url, getHeaders());
      return response.data;
    } catch (error) {
      return { projects: [], customers: [], tasks: [] };
    }
  }, [token, getHeaders]);

  // Upload file for chat
  const uploadFile = useCallback(async (conversationId, file) => {
    if (!token || !file) return null;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(
        `${API_URL}/chat/conversations/${conversationId}/files`,
        formData,
        {
          ...getHeaders(),
          headers: {
            ...getHeaders().headers,
            "Content-Type": "multipart/form-data"
          }
        }
      );
      return response.data;
    } catch (error) {
      toast.error("Dosya yüklenemedi");
      return null;
    }
  }, [token, getHeaders]);

  // Select conversation
  const selectConversation = useCallback((conversation) => {
    setActiveConversation(conversation);
    setMessages([]);
    if (conversation) {
      fetchMessages(conversation.id);
      // Mark as read
      setConversations(prev => prev.map(c => 
        c.id === conversation.id ? { ...c, unread_count: 0 } : c
      ));
    }
  }, [fetchMessages]);

  // Handle WebSocket messages
  const handleWsMessage = useCallback((data) => {
    switch (data.type) {
      case "new_message":
        if (activeConversation?.id === data.conversation_id) {
          setMessages(prev => [...prev, data.message]);
        }
        fetchConversations();
        break;

      case "message_edited":
        setMessages(prev => prev.map(m => 
          m.id === data.message.id ? data.message : m
        ));
        break;

      case "message_deleted":
        setMessages(prev => prev.map(m => 
          m.id === data.message_id ? { ...m, is_deleted: true, content: "Bu mesaj silindi." } : m
        ));
        break;

      case "reaction_added":
        setMessages(prev => prev.map(m => {
          if (m.id === data.message_id) {
            return { ...m, reactions: [...(m.reactions || []), data.reaction] };
          }
          return m;
        }));
        break;

      case "reaction_removed":
        setMessages(prev => prev.map(m => {
          if (m.id === data.message_id) {
            return {
              ...m,
              reactions: (m.reactions || []).filter(
                r => !(r.user_id === data.user_id && r.emoji === data.emoji)
              )
            };
          }
          return m;
        }));
        break;

      case "typing":
        if (data.is_typing) {
          setTypingUsers(prev => ({
            ...prev,
            [data.conversation_id]: {
              ...(prev[data.conversation_id] || {}),
              [data.user_id]: data.user_name
            }
          }));
          // Auto-clear typing after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => {
              const conv = { ...(prev[data.conversation_id] || {}) };
              delete conv[data.user_id];
              return { ...prev, [data.conversation_id]: conv };
            });
          }, 3000);
        } else {
          setTypingUsers(prev => {
            const conv = { ...(prev[data.conversation_id] || {}) };
            delete conv[data.user_id];
            return { ...prev, [data.conversation_id]: conv };
          });
        }
        break;

      case "participant_added":
      case "participant_removed":
        fetchConversations();
        break;

      default:
        break;
    }
  }, [activeConversation, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchConversations();
    }
  }, [isAuthenticated, token, fetchConversations]);

  const value = {
    conversations,
    activeConversation,
    messages,
    loadingConversations,
    loadingMessages,
    typingUsers,
    totalUnreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    createConversation,
    selectConversation,
    sendTypingIndicator,
    searchUsers,
    searchResources,
    uploadFile,
    handleWsMessage
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
