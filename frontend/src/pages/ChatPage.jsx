import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  MessageSquare,
  Users,
  Hash,
  FolderKanban,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Pencil,
  Trash2,
  Reply,
  Search,
  Plus,
  X,
  Check,
  Loader2,
  AtSign,
  Link2,
  Image,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

const AVAILABLE_REACTIONS = ["👍", "❤️", "😊", "🎉", "😮", "😢", "😂", "🔥"];
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ConversationTypeIcon = ({ type }) => {
  switch (type) {
    case "direct":
      return <MessageSquare className="h-4 w-4" />;
    case "group":
      return <Users className="h-4 w-4" />;
    case "project":
      return <FolderKanban className="h-4 w-4" />;
    case "general":
      return <Hash className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

const ConversationItem = ({ conversation, isActive, onClick, currentUserId }) => {
  const otherParticipant = conversation.type === "direct"
    ? conversation.participants?.find(p => p.id !== currentUserId)
    : null;

  const displayName = conversation.type === "direct"
    ? otherParticipant?.name || "Bilinmiyor"
    : conversation.name || (conversation.type === "project" ? conversation.project_name : "Genel Sohbet");

  const avatarUrl = conversation.type === "direct"
    ? otherParticipant?.avatar_url
    : conversation.avatar_url;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
        isActive
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50 border border-transparent"
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          {avatarUrl && <AvatarImage src={BACKEND_URL + avatarUrl} />}
          <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary">
            {conversation.type === "general" ? "#" : getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        {conversation.type === "direct" && otherParticipant?.is_online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">{displayName}</span>
          {conversation.last_message && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                addSuffix: false,
                locale: tr
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground truncate flex-1">
            {conversation.last_message?.is_deleted
              ? "Bu mesaj silindi"
              : conversation.last_message?.content || "Henüz mesaj yok"}
          </p>
          {conversation.unread_count > 0 && (
            <Badge className="h-5 min-w-[20px] flex items-center justify-center">
              {conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
};

const MessageBubble = ({
  message,
  isOwn,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  currentUserId
}) => {
  const [showActions, setShowActions] = useState(false);
  const canEditOrDelete = isOwn && !message.is_deleted;

  // Check if within 5 minutes
  const createdAt = new Date(message.created_at);
  const now = new Date();
  const withinTimeLimit = (now - createdAt) / 1000 < 300; // 5 minutes

  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});

  const userHasReacted = (emoji) => {
    return (message.reactions || []).some(
      r => r.emoji === emoji && r.user_id === currentUserId
    );
  };

  return (
    <div
      className={cn(
        "group flex gap-3 max-w-[85%] mb-4",
        isOwn ? "ml-auto flex-row-reverse" : ""
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isOwn && (
        <Avatar className="h-8 w-8 mt-1">
          {message.sender_avatar && (
            <AvatarImage src={BACKEND_URL + message.sender_avatar} />
          )}
          <AvatarFallback className="text-xs">
            {getInitials(message.sender_name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
        {!isOwn && (
          <span className="text-xs text-muted-foreground mb-1">
            {message.sender_name}
          </span>
        )}

        {/* Reply reference */}
        {message.reply_to && (
          <div className={cn(
            "text-xs px-3 py-1.5 rounded-t-lg border-l-2 border-primary/50 bg-muted/50 mb-0.5",
            isOwn ? "rounded-l-lg" : "rounded-r-lg"
          )}>
            <span className="font-medium text-primary/70">
              {message.reply_to.sender_name}
            </span>
            <p className="text-muted-foreground truncate max-w-[200px]">
              {message.reply_to.is_deleted ? "Bu mesaj silindi" : message.reply_to.content}
            </p>
          </div>
        )}

        <div
          className={cn(
            "relative px-4 py-2 rounded-2xl",
            message.is_deleted
              ? "bg-muted/30 text-muted-foreground italic"
              : isOwn
                ? "bg-primary text-primary-foreground"
                : "bg-muted",
            message.reply_to && (isOwn ? "rounded-tr-md" : "rounded-tl-md")
          )}
        >
          {/* Message content */}
          <p className="whitespace-pre-wrap break-words">{message.content}</p>

          {/* File attachment */}
          {message.file && (
            <a
              href={BACKEND_URL + message.file.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 mt-2 p-2 rounded-lg",
                isOwn ? "bg-primary-foreground/10" : "bg-background"
              )}
            >
              {message.file.type?.startsWith("image/") ? (
                <Image className="h-4 w-4" />
              ) : (
                <File className="h-4 w-4" />
              )}
              <span className="text-sm truncate">{message.file.name}</span>
            </a>
          )}

          {/* Link previews */}
          {message.link_previews?.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.link_previews.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  className={cn(
                    "block p-2 rounded-lg text-sm",
                    isOwn ? "bg-primary-foreground/10" : "bg-background"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3 w-3" />
                    <span className="font-medium">{link.title}</span>
                  </div>
                  {link.subtitle && (
                    <p className="text-xs opacity-70">{link.subtitle}</p>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* Edited indicator */}
          {message.is_edited && !message.is_deleted && (
            <span className={cn(
              "text-[10px] opacity-60 ml-2",
              isOwn ? "text-primary-foreground" : "text-muted-foreground"
            )}>
              (düzenlendi)
            </span>
          )}

          {/* Timestamp */}
          <span className={cn(
            "text-[10px] opacity-60 ml-2",
            isOwn ? "text-primary-foreground" : "text-muted-foreground"
          )}>
            {format(new Date(message.created_at), "HH:mm")}
          </span>
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, reactions]) => (
              <TooltipProvider key={emoji}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onReaction(message.id, emoji, userHasReacted(emoji))}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                        userHasReacted(emoji)
                          ? "bg-primary/10 border-primary/30"
                          : "bg-muted/50 border-transparent hover:bg-muted"
                      )}
                    >
                      <span>{emoji}</span>
                      <span>{reactions.length}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {reactions.map(r => r.user_name).join(", ")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {showActions && !message.is_deleted && (
          <div className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "flex-row-reverse" : ""
          )}>
            {/* Reaction picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Smile className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align={isOwn ? "end" : "start"}>
                <div className="flex gap-1">
                  {AVAILABLE_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReaction(message.id, emoji, userHasReacted(emoji));
                      }}
                      className={cn(
                        "p-1 rounded hover:bg-muted text-lg",
                        userHasReacted(emoji) && "bg-primary/10"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onReply(message)}
            >
              <Reply className="h-3 w-3" />
            </Button>

            {canEditOrDelete && withinTimeLimit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? "end" : "start"}>
                  <DropdownMenuItem onClick={() => onEdit(message)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Düzenle
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(message.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ChatPage = () => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    loadingConversations,
    loadingMessages,
    typingUsers,
    selectConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    createConversation,
    sendTypingIndicator,
    searchUsers,
    uploadFile
  } = useChat();

  const [messageInput, setMessageInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatUsers, setNewChatUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search users for new chat
  useEffect(() => {
    const search = async () => {
      if (userSearchQuery.length < 1) {
        setUserSearchResults([]);
        return;
      }
      setSearchingUsers(true);
      const results = await searchUsers(userSearchQuery);
      setUserSearchResults(results.filter(u => u.id !== user?.id));
      setSearchingUsers(false);
    };
    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [userSearchQuery, searchUsers, user]);

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const name = c.name || c.project_name || "";
    const participants = c.participants?.map(p => p.name).join(" ") || "";
    return (name + participants).toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Handle typing indicator
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (activeConversation) {
      sendTypingIndicator(activeConversation.id, true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(activeConversation.id, false);
      }, 2000);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!messageInput.trim() || !activeConversation) return;

    if (editingMessage) {
      await editMessage(editingMessage.id, messageInput);
      setEditingMessage(null);
    } else {
      await sendMessage(activeConversation.id, messageInput, {
        replyToId: replyTo?.id
      });
      setReplyTo(null);
    }
    setMessageInput("");
  };

  // Handle file upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    const uploaded = await uploadFile(activeConversation.id, file);
    if (uploaded) {
      await sendMessage(activeConversation.id, file.name, {
        type: uploaded.type === "image" ? "image" : "file",
        fileId: uploaded.id
      });
    }
    e.target.value = "";
  };

  // Handle reaction
  const handleReaction = async (messageId, emoji, hasReacted) => {
    if (hasReacted) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  };

  // Handle edit
  const handleEdit = (message) => {
    setEditingMessage(message);
    setMessageInput(message.content);
    setReplyTo(null);
  };

  // Handle reply
  const handleReply = (message) => {
    setReplyTo(message);
    setEditingMessage(null);
  };

  // Create new conversation
  const handleCreateConversation = async () => {
    if (newChatUsers.length === 0) return;

    if (newChatUsers.length === 1) {
      // Direct message
      const conv = await createConversation("direct", [newChatUsers[0].id]);
      if (conv) {
        selectConversation(conv);
        setShowNewChat(false);
        setNewChatUsers([]);
        setUserSearchQuery("");
      }
    } else {
      // Group chat
      const conv = await createConversation(
        "group",
        newChatUsers.map(u => u.id),
        `Grup (${newChatUsers.length + 1} kişi)`
      );
      if (conv) {
        selectConversation(conv);
        setShowNewChat(false);
        setNewChatUsers([]);
        setUserSearchQuery("");
      }
    }
  };

  // Get typing users for active conversation
  const activeTypingUsers = typingUsers[activeConversation?.id] || {};
  const typingUserNames = Object.values(activeTypingUsers).filter(
    name => name !== user?.full_name
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Sohbetler</h2>
            <Button size="icon" variant="ghost" onClick={() => setShowNewChat(true)}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sohbet ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Sohbet bulunamadı
              </div>
            ) : (
              filteredConversations.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={activeConversation?.id === conv.id}
                  onClick={() => selectConversation(conv)}
                  currentUserId={user?.id}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="h-16 border-b flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    <ConversationTypeIcon type={activeConversation.type} />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">
                    {activeConversation.type === "direct"
                      ? activeConversation.participants?.find(p => p.id !== user?.id)?.name
                      : activeConversation.name || activeConversation.project_name || "Genel Sohbet"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {activeConversation.type === "general"
                      ? "Tüm ekip üyeleri"
                      : `${activeConversation.participants?.length || 0} katılımcı`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                  <p>Henüz mesaj yok</p>
                  <p className="text-sm">İlk mesajı gönderin!</p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={msg.sender_id === user?.id}
                      onEdit={handleEdit}
                      onDelete={deleteMessage}
                      onReply={handleReply}
                      onReaction={handleReaction}
                      currentUserId={user?.id}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}

              {/* Typing indicator */}
              {typingUserNames.length > 0 && (
                <div className="text-sm text-muted-foreground italic pl-11">
                  {typingUserNames.join(", ")} yazıyor...
                </div>
              )}
            </ScrollArea>

            {/* Input area */}
            <div className="border-t p-4">
              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
                  <Reply className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium">{replyTo.sender_name}</span>
                    <p className="text-xs text-muted-foreground truncate">
                      {replyTo.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setReplyTo(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Edit preview */}
              {editingMessage && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-primary/10 rounded-lg">
                  <Pencil className="h-4 w-4 text-primary" />
                  <span className="text-xs text-primary">Mesaj düzenleniyor</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-auto"
                    onClick={() => {
                      setEditingMessage(null);
                      setMessageInput("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Mesaj yazın..."
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!messageInput.trim()}>
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-1">Sohbet seçin</h3>
            <p className="text-sm">Sol taraftan bir sohbet seçin veya yeni bir sohbet başlatın</p>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Sohbet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selected users */}
            {newChatUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newChatUsers.map(u => (
                  <Badge key={u.id} variant="secondary" className="gap-1">
                    {u.full_name}
                    <button
                      onClick={() => setNewChatUsers(prev => prev.filter(p => p.id !== u.id))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* User search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kullanıcı ara..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Search results */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {searchingUsers ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : userSearchResults.length > 0 ? (
                userSearchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (!newChatUsers.find(p => p.id === u.id)) {
                        setNewChatUsers(prev => [...prev, u]);
                      }
                      setUserSearchQuery("");
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                  >
                    <Avatar className="h-8 w-8">
                      {u.avatar_url && <AvatarImage src={BACKEND_URL + u.avatar_url} />}
                      <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                    </Avatar>
                    <span>{u.full_name}</span>
                    {newChatUsers.find(p => p.id === u.id) && (
                      <Check className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </button>
                ))
              ) : userSearchQuery ? (
                <p className="text-center py-4 text-muted-foreground">
                  Kullanıcı bulunamadı
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChat(false)}>
              İptal
            </Button>
            <Button onClick={handleCreateConversation} disabled={newChatUsers.length === 0}>
              Sohbet Başlat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;
