import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Image,
  File,
  Settings,
  UserPlus,
  UserMinus,
  Pin,
  PinOff,
  Info,
  ChevronRight,
  FileText,
  Link2,
  Building2,
  ClipboardList,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";

const AVAILABLE_REACTIONS = ["👍", "❤️", "😊", "🎉", "😮", "😢", "😂", "🔥"];
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

const formatMessageDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isToday(date)) return "Bugün";
  if (isYesterday(date)) return "Dün";
  return format(date, "d MMMM yyyy", { locale: tr });
};

// Conversation Type Badge
const ConversationTypeBadge = ({ type }) => {
  const config = {
    direct: { icon: MessageSquare, label: "Bireysel", color: "bg-blue-500/10 text-blue-500" },
    group: { icon: Users, label: "Grup", color: "bg-purple-500/10 text-purple-500" },
    project: { icon: FolderKanban, label: "Proje", color: "bg-green-500/10 text-green-500" },
    general: { icon: Hash, label: "Genel", color: "bg-amber-500/10 text-amber-500" },
  };
  const { icon: Icon, label, color } = config[type] || config.direct;
  return (
    <Badge variant="secondary" className={cn("gap-1", color)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

// Conversation List Item
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
        "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
        isActive
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "hover:bg-muted/80"
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
          {avatarUrl && <AvatarImage src={BACKEND_URL + avatarUrl} />}
          <AvatarFallback className={cn(
            "font-semibold",
            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-gradient-to-br from-primary/20 to-primary/5 text-primary"
          )}>
            {conversation.type === "general" ? "#" : getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        {conversation.type === "direct" && otherParticipant?.is_online && (
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background ring-2 ring-green-500/20" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn("font-semibold truncate", isActive && "text-primary-foreground")}>
            {displayName}
          </span>
          {conversation.last_message && (
            <span className={cn("text-xs", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                addSuffix: false,
                locale: tr
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className={cn(
            "text-sm truncate flex-1",
            isActive ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {conversation.last_message?.is_deleted
              ? "Bu mesaj silindi"
              : conversation.last_message?.content || "Henüz mesaj yok"}
          </p>
          {conversation.unread_count > 0 && (
            <Badge className={cn(
              "h-5 min-w-[20px] flex items-center justify-center text-xs font-bold",
              isActive ? "bg-primary-foreground text-primary" : ""
            )}>
              {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
};

// Message Bubble Component
const MessageBubble = ({
  message,
  isOwn,
  showAvatar,
  showName,
  onEdit,
  onDelete,
  onReply,
  onPin,
  onReaction,
  currentUserId
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const canEditOrDelete = isOwn && !message.is_deleted;

  // Check if within 5 minutes
  const createdAt = new Date(message.created_at);
  const now = new Date();
  const withinTimeLimit = (now - createdAt) / 1000 < 300;

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
        "group flex gap-2 max-w-[75%] relative",
        isOwn ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {/* Avatar */}
      {showAvatar && !isOwn ? (
        <Avatar className="h-8 w-8 mt-auto mb-1 flex-shrink-0">
          {message.sender_avatar && (
            <AvatarImage src={BACKEND_URL + message.sender_avatar} />
          )}
          <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5">
            {getInitials(message.sender_name)}
          </AvatarFallback>
        </Avatar>
      ) : !isOwn && (
        <div className="w-8 flex-shrink-0" />
      )}

      <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
        {/* Sender name */}
        {showName && !isOwn && (
          <span className="text-xs font-medium text-primary mb-1 ml-1">
            {message.sender_name}
          </span>
        )}

        {/* Reply reference */}
        {message.reply_to && (
          <div className={cn(
            "text-xs px-3 py-1.5 rounded-lg bg-muted/50 border-l-2 border-primary/50 mb-1 max-w-full",
            isOwn ? "rounded-br-none" : "rounded-bl-none"
          )}>
            <span className="font-medium text-primary">
              {message.reply_to.sender_name}
            </span>
            <p className="text-muted-foreground truncate">
              {message.reply_to.is_deleted ? "Bu mesaj silindi" : message.reply_to.content}
            </p>
          </div>
        )}

        {/* Pinned indicator */}
        {message.is_pinned && (
          <div className="flex items-center gap-1 text-xs text-amber-500 mb-1">
            <Pin className="h-3 w-3" />
            <span>Sabitlendi</span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "relative px-4 py-2.5 rounded-2xl shadow-sm",
            message.is_deleted
              ? "bg-muted/30 text-muted-foreground italic"
              : isOwn
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-card border rounded-bl-md",
          )}
        >
          {/* Message content */}
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {message.content}
          </p>

          {/* File attachment */}
          {message.file && (
            <a
              href={BACKEND_URL + message.file.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 mt-2 p-2 rounded-lg transition-colors",
                isOwn ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted hover:bg-muted/80"
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
            <div className="mt-2 space-y-1.5">
              {message.link_previews.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  className={cn(
                    "block p-2.5 rounded-lg text-sm transition-colors",
                    isOwn ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      isOwn ? "bg-primary-foreground/10" : "bg-primary/10"
                    )}>
                      {link.type === "project" && <FolderKanban className="h-4 w-4" />}
                      {link.type === "customer" && <Building2 className="h-4 w-4" />}
                      {link.type === "task" && <ClipboardList className="h-4 w-4" />}
                      {link.type === "file" && <FileText className="h-4 w-4" />}
                      {!["project", "customer", "task", "file"].includes(link.type) && <Link2 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium truncate block">{link.title}</span>
                      {link.subtitle && (
                        <p className="text-xs opacity-70 truncate">{link.subtitle}</p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Timestamp & edited */}
          <div className={cn(
            "flex items-center gap-1.5 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}>
            {message.is_edited && !message.is_deleted && (
              <span className={cn(
                "text-[10px]",
                isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
              )}>
                düzenlendi
              </span>
            )}
            <span className={cn(
              "text-[10px]",
              isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
            )}>
              {format(new Date(message.created_at), "HH:mm")}
            </span>
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(groupedReactions).map(([emoji, reactions]) => (
              <TooltipProvider key={emoji}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onReaction(message.id, emoji, userHasReacted(emoji))}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all",
                        userHasReacted(emoji)
                          ? "bg-primary/10 border-primary/30 scale-105"
                          : "bg-card border-border hover:bg-muted hover:scale-105"
                      )}
                    >
                      <span>{emoji}</span>
                      <span className="font-medium">{reactions.length}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{reactions.map(r => r.user_name).join(", ")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* Action buttons - Always visible on hover */}
        <div className={cn(
          "flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
          isOwn ? "flex-row-reverse" : ""
        )}>
          {/* Emoji picker */}
          <Popover open={showReactions} onOpenChange={setShowReactions}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align={isOwn ? "end" : "start"} side="top">
              <div className="flex gap-1">
                {AVAILABLE_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReaction(message.id, emoji, userHasReacted(emoji));
                      setShowReactions(false);
                    }}
                    className={cn(
                      "p-1.5 rounded-lg hover:bg-muted text-xl transition-transform hover:scale-125",
                      userHasReacted(emoji) && "bg-primary/10"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {!message.is_deleted && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={() => onReply(message)}
              >
                <Reply className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? "end" : "start"}>
                  <DropdownMenuItem onClick={() => onPin(message.id, message.is_pinned)}>
                    {message.is_pinned ? (
                      <>
                        <PinOff className="h-4 w-4 mr-2" />
                        Sabitlemeyi Kaldır
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4 mr-2" />
                        Sabitle
                      </>
                    )}
                  </DropdownMenuItem>
                  {canEditOrDelete && withinTimeLimit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(message)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(message.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Sil
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Resource Picker Component
const ResourcePicker = ({ onSelect, onClose }) => {
  const { searchResources } = useChat();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ projects: [], customers: [], tasks: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults({ projects: [], customers: [], tasks: [] });
        return;
      }
      setLoading(true);
      const res = await searchResources(query);
      setResults(res);
      setLoading(false);
    };
    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [query, searchResources]);

  const handleSelect = (type, item) => {
    onSelect({
      type,
      id: item.id,
      name: item.name || `${item.work_item_name} - ${item.subtask_name}`,
    });
    onClose();
  };

  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput 
        placeholder="Proje, müşteri veya görev ara..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : query.length < 2 ? (
          <CommandEmpty>En az 2 karakter girin</CommandEmpty>
        ) : (
          <>
            {results.projects.length > 0 && (
              <CommandGroup heading="Projeler">
                {results.projects.map(p => (
                  <CommandItem
                    key={p.id}
                    onSelect={() => handleSelect("project", p)}
                    className="gap-2"
                  >
                    <FolderKanban className="h-4 w-4 text-green-500" />
                    <span>{p.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">{p.status}</Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.customers.length > 0 && (
              <CommandGroup heading="Müşteriler">
                {results.customers.map(c => (
                  <CommandItem
                    key={c.id}
                    onSelect={() => handleSelect("customer", c)}
                    className="gap-2"
                  >
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <span>{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{c.phone}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.tasks.length > 0 && (
              <CommandGroup heading="Görevler">
                {results.tasks.map(t => (
                  <CommandItem
                    key={t.id}
                    onSelect={() => handleSelect("task", t)}
                    className="gap-2"
                  >
                    <ClipboardList className="h-4 w-4 text-amber-500" />
                    <span className="truncate">{t.work_item_name} - {t.subtask_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.projects.length === 0 && results.customers.length === 0 && results.tasks.length === 0 && (
              <CommandEmpty>Sonuç bulunamadı</CommandEmpty>
            )}
          </>
        )}
      </CommandList>
    </Command>
  );
};

// Main Chat Page Component
const ChatPage = () => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    pinnedMessages,
    loadingConversations,
    loadingMessages,
    typingUsers,
    selectConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePinMessage,
    addReaction,
    removeReaction,
    createConversation,
    updateConversation,
    addParticipant,
    removeParticipant,
    sendTypingIndicator,
    searchUsers,
    uploadFile
  } = useChat();

  // States
  const [messageInput, setMessageInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatType, setNewChatType] = useState("direct"); // direct or group
  const [newChatUsers, setNewChatUsers] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingConversation, setEditingConversation] = useState(false);
  const [tempConvName, setTempConvName] = useState("");
  const [tempConvDescription, setTempConvDescription] = useState("");
  // @mention states
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search for @mention
  useEffect(() => {
    const search = async () => {
      if (!showMentionPicker || mentionQuery.length < 1) {
        setMentionResults([]);
        return;
      }
      setMentionLoading(true);
      const results = await searchUsers(mentionQuery);
      setMentionResults(results.filter(u => u.id !== user?.id));
      setMentionLoading(false);
    };
    const timeout = setTimeout(search, 200);
    return () => clearTimeout(timeout);
  }, [mentionQuery, showMentionPicker, searchUsers, user]);

  // Search users
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

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg, idx) => {
    const dateKey = formatMessageDate(msg.created_at);
    if (!acc[dateKey]) acc[dateKey] = [];
    
    const prevMsg = messages[idx - 1];
    const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id || 
      (new Date(msg.created_at) - new Date(prevMsg.created_at)) > 300000; // 5 min
    const showName = showAvatar;
    
    acc[dateKey].push({ ...msg, showAvatar, showName });
    return acc;
  }, {});

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

  // Handle resource selection
  const handleResourceSelect = async (resource) => {
    if (!activeConversation) return;
    const linkText = `[[${resource.type}:${resource.id}]]`;
    const content = `📎 ${resource.name}`;
    await sendMessage(activeConversation.id, content, {
      links: [{ type: resource.type, id: resource.id }]
    });
  };

  // Handle reaction
  const handleReaction = async (messageId, emoji, hasReacted) => {
    if (hasReacted) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  };

  // Create conversation
  const handleCreateConversation = async () => {
    if (newChatUsers.length === 0) return;

    if (newChatType === "direct" && newChatUsers.length === 1) {
      const conv = await createConversation("direct", [newChatUsers[0].id]);
      if (conv) {
        selectConversation(conv);
        resetNewChat();
      }
    } else {
      // Group chat
      if (!newGroupName.trim()) {
        return;
      }
      const conv = await createConversation(
        "group",
        newChatUsers.map(u => u.id),
        newGroupName.trim(),
        newGroupDescription.trim() || null
      );
      if (conv) {
        selectConversation(conv);
        resetNewChat();
      }
    }
  };

  const resetNewChat = () => {
    setShowNewChat(false);
    setNewChatType("direct");
    setNewChatUsers([]);
    setNewGroupName("");
    setNewGroupDescription("");
    setUserSearchQuery("");
  };

  // Update conversation
  const handleUpdateConversation = async () => {
    if (!activeConversation) return;
    await updateConversation(activeConversation.id, {
      name: tempConvName,
      description: tempConvDescription
    });
    setEditingConversation(false);
  };

  // Get typing users for active conversation
  const activeTypingUsers = typingUsers[activeConversation?.id] || {};
  const typingUserNames = Object.values(activeTypingUsers).filter(
    name => name !== user?.full_name
  );

  // Get other participant for direct chat
  const otherParticipant = activeConversation?.type === "direct"
    ? activeConversation.participants?.find(p => p.id !== user?.id)
    : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col bg-card/50">
        {/* Header */}
        <div className="p-4 border-b bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Sohbetler</h2>
            <Button size="icon" variant="default" className="rounded-full" onClick={() => setShowNewChat(true)}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sohbet ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
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
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Sohbet bulunamadı</p>
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
      <div className="flex-1 flex flex-col bg-muted/30">
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="h-16 border-b flex items-center justify-between px-4 bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  {activeConversation.avatar_url && (
                    <AvatarImage src={BACKEND_URL + activeConversation.avatar_url} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                    {activeConversation.type === "general" ? "#" : 
                     activeConversation.type === "direct" ? getInitials(otherParticipant?.name) :
                     getInitials(activeConversation.name || activeConversation.project_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {activeConversation.type === "direct"
                        ? otherParticipant?.name || "Bilinmiyor"
                        : activeConversation.name || activeConversation.project_name || "Genel Sohbet"}
                    </h3>
                    <ConversationTypeBadge type={activeConversation.type} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeConversation.type === "direct" 
                      ? (otherParticipant?.is_online ? "Çevrimiçi" : "Çevrimdışı")
                      : `${activeConversation.participants?.length || 0} katılımcı`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowConversationInfo(true);
                  setTempConvName(activeConversation.name || "");
                  setTempConvDescription(activeConversation.description || "");
                }}
              >
                <Info className="h-5 w-5" />
              </Button>
            </div>

            {/* Pinned messages bar */}
            {pinnedMessages.length > 0 && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b flex items-center gap-2">
                <Pin className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {pinnedMessages.length} sabitlenmiş mesaj
                </span>
                <ChevronRight className="h-4 w-4 text-amber-500" />
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="h-10 w-10 text-primary" />
                  </div>
                  <p className="font-medium">Henüz mesaj yok</p>
                  <p className="text-sm">İlk mesajı gönderin!</p>
                </div>
              ) : (
                <>
                  {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                      {/* Date divider */}
                      <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {date}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      
                      {/* Messages */}
                      <div className="space-y-1">
                        {msgs.map(msg => (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={msg.sender_id === user?.id}
                            showAvatar={msg.showAvatar}
                            showName={msg.showName}
                            onEdit={(m) => {
                              setEditingMessage(m);
                              setMessageInput(m.content);
                              setReplyTo(null);
                            }}
                            onDelete={deleteMessage}
                            onReply={(m) => {
                              setReplyTo(m);
                              setEditingMessage(null);
                            }}
                            onPin={togglePinMessage}
                            onReaction={handleReaction}
                            currentUserId={user?.id}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}

              {/* Typing indicator */}
              {typingUserNames.length > 0 && (
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm italic">{typingUserNames.join(", ")} yazıyor...</span>
                </div>
              )}
            </ScrollArea>

            {/* Input area */}
            <div className="border-t p-4 bg-card">
              {/* Reply/Edit preview */}
              {(replyTo || editingMessage) && (
                <div className={cn(
                  "flex items-center gap-2 mb-3 p-3 rounded-lg",
                  editingMessage ? "bg-primary/10 border-l-4 border-primary" : "bg-muted border-l-4 border-muted-foreground"
                )}>
                  {editingMessage ? (
                    <Pencil className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <Reply className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-xs font-medium", editingMessage ? "text-primary" : "text-muted-foreground")}>
                      {editingMessage ? "Mesaj düzenleniyor" : replyTo.sender_name}
                    </span>
                    {replyTo && (
                      <p className="text-xs text-muted-foreground truncate">
                        {replyTo.content}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => {
                      setReplyTo(null);
                      setEditingMessage(null);
                      setMessageInput("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                
                {/* Attachment button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>

                {/* Resource picker button */}
                <Popover open={showResourcePicker} onOpenChange={setShowResourcePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start" side="top">
                    <ResourcePicker
                      onSelect={handleResourceSelect}
                      onClose={() => setShowResourcePicker(false)}
                    />
                  </PopoverContent>
                </Popover>

                {/* Message input */}
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Mesaj yazın..."
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="min-h-[44px] max-h-[120px] resize-none pr-10 rounded-2xl"
                    rows={1}
                  />
                </div>

                {/* Send button */}
                <Button
                  onClick={handleSend}
                  disabled={!messageInput.trim()}
                  className="flex-shrink-0 rounded-full h-11 w-11"
                  size="icon"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <MessageSquare className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Sohbet Seçin</h3>
            <p className="text-sm max-w-xs text-center">
              Sol taraftan bir sohbet seçin veya yeni bir sohbet başlatın
            </p>
            <Button className="mt-4" onClick={() => setShowNewChat(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Sohbet
            </Button>
          </div>
        )}
      </div>

      {/* Conversation Info Sheet */}
      <Sheet open={showConversationInfo} onOpenChange={setShowConversationInfo}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Sohbet Bilgileri</SheetTitle>
            <SheetDescription>
              Sohbet ayarları ve katılımcı yönetimi
            </SheetDescription>
          </SheetHeader>

          {activeConversation && (
            <div className="mt-6 space-y-6">
              {/* Avatar & Name */}
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  {activeConversation.avatar_url && (
                    <AvatarImage src={BACKEND_URL + activeConversation.avatar_url} />
                  )}
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/50 text-primary-foreground">
                    {activeConversation.type === "general" ? "#" : 
                     getInitials(activeConversation.name || activeConversation.project_name || otherParticipant?.name)}
                  </AvatarFallback>
                </Avatar>
                
                {editingConversation && (activeConversation.type === "group" || activeConversation.type === "project") ? (
                  <div className="mt-4 w-full space-y-3">
                    <Input
                      value={tempConvName}
                      onChange={(e) => setTempConvName(e.target.value)}
                      placeholder="Grup adı"
                    />
                    <Textarea
                      value={tempConvDescription}
                      onChange={(e) => setTempConvDescription(e.target.value)}
                      placeholder="Açıklama"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateConversation}>
                        <Check className="h-4 w-4 mr-1" /> Kaydet
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingConversation(false)}>
                        İptal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="mt-4 text-xl font-semibold">
                      {activeConversation.type === "direct"
                        ? otherParticipant?.name
                        : activeConversation.name || activeConversation.project_name || "Genel Sohbet"}
                    </h3>
                    {activeConversation.description && (
                      <p className="text-sm text-muted-foreground mt-1">{activeConversation.description}</p>
                    )}
                    <ConversationTypeBadge type={activeConversation.type} />
                    
                    {(activeConversation.type === "group") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => setEditingConversation(true)}
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Düzenle
                      </Button>
                    )}
                  </>
                )}
              </div>

              <Separator />

              {/* Participants */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Katılımcılar ({activeConversation.participants?.length || 0})</h4>
                  {activeConversation.type === "group" && (
                    <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Ekle
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {activeConversation.participants?.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              {p.avatar_url && <AvatarImage src={BACKEND_URL + p.avatar_url} />}
                              <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                            </Avatar>
                            {p.is_online && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.is_online ? "Çevrimiçi" : "Çevrimdışı"}
                            </p>
                          </div>
                        </div>
                        {activeConversation.type === "group" && p.id !== user?.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeParticipant(activeConversation.id, p.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Shared files section would go here */}
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Paylaşılan Dosyalar</h4>
                <p className="text-sm text-muted-foreground text-center py-4">
                  Henüz dosya paylaşılmadı
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üye Ekle</DialogTitle>
            <DialogDescription>Gruba yeni üye ekleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kullanıcı ara..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[200px]">
              {searchingUsers ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : userSearchResults.length > 0 ? (
                <div className="space-y-1">
                  {userSearchResults
                    .filter(u => !activeConversation?.participants?.some(p => p.id === u.id))
                    .map(u => (
                      <button
                        key={u.id}
                        onClick={async () => {
                          await addParticipant(activeConversation.id, u.id);
                          setShowAddMember(false);
                          setUserSearchQuery("");
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                      >
                        <Avatar className="h-8 w-8">
                          {u.avatar_url && <AvatarImage src={BACKEND_URL + u.avatar_url} />}
                          <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                        </Avatar>
                        <span>{u.full_name}</span>
                        <Plus className="h-4 w-4 ml-auto text-muted-foreground" />
                      </button>
                    ))}
                </div>
              ) : userSearchQuery ? (
                <p className="text-center py-4 text-muted-foreground">Kullanıcı bulunamadı</p>
              ) : null}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={(open) => { if (!open) resetNewChat(); else setShowNewChat(true); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yeni Sohbet</DialogTitle>
            <DialogDescription>
              Bireysel sohbet veya grup oluşturun
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Chat type selector */}
            <div className="flex gap-2">
              <Button
                variant={newChatType === "direct" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setNewChatType("direct");
                  setNewChatUsers([]);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Bireysel
              </Button>
              <Button
                variant={newChatType === "group" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setNewChatType("group")}
              >
                <Users className="h-4 w-4 mr-2" />
                Grup
              </Button>
            </div>

            {/* Group name input */}
            {newChatType === "group" && (
              <div className="space-y-3">
                <div>
                  <Label>Grup Adı *</Label>
                  <Input
                    placeholder="Grup adı girin..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Açıklama</Label>
                  <Textarea
                    placeholder="Grup açıklaması (opsiyonel)"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Selected users */}
            {newChatUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newChatUsers.map(u => (
                  <Badge key={u.id} variant="secondary" className="gap-1 py-1">
                    <Avatar className="h-5 w-5">
                      {u.avatar_url && <AvatarImage src={BACKEND_URL + u.avatar_url} />}
                      <AvatarFallback className="text-[10px]">{getInitials(u.full_name)}</AvatarFallback>
                    </Avatar>
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
            <ScrollArea className="h-[200px] border rounded-lg">
              {searchingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : userSearchResults.length > 0 ? (
                <div className="p-2 space-y-1">
                  {userSearchResults.map(u => {
                    const isSelected = newChatUsers.find(p => p.id === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          if (newChatType === "direct") {
                            setNewChatUsers([u]);
                          } else {
                            if (isSelected) {
                              setNewChatUsers(prev => prev.filter(p => p.id !== u.id));
                            } else {
                              setNewChatUsers(prev => [...prev, u]);
                            }
                          }
                          setUserSearchQuery("");
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                          isSelected ? "bg-primary/10" : "hover:bg-muted"
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          {u.avatar_url && <AvatarImage src={BACKEND_URL + u.avatar_url} />}
                          <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.full_name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 ml-auto text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : userSearchQuery ? (
                <p className="text-center py-8 text-muted-foreground">
                  Kullanıcı bulunamadı
                </p>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Kullanıcı aramak için yazın
                </p>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetNewChat}>
              İptal
            </Button>
            <Button 
              onClick={handleCreateConversation} 
              disabled={newChatUsers.length === 0 || (newChatType === "group" && !newGroupName.trim())}
            >
              {newChatType === "direct" ? "Sohbet Başlat" : "Grup Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;
