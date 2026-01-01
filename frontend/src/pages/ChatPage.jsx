import React, { useState, useEffect, useRef } from "react";
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
  AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";

const AVAILABLE_REACTIONS = ["👍", "❤️", "😊", "🎉", "😮", "😢", "😂", "🔥"];
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// --- Helper Functions ---
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

// --- Components ---

// Conversation Type Badge
const ConversationTypeBadge = ({ type }) => {
  const config = {
    direct: { icon: MessageSquare, label: "Bireysel", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
    group: { icon: Users, label: "Grup", color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20" },
    project: { icon: FolderKanban, label: "Proje", color: "bg-green-500/10 text-green-500 hover:bg-green-500/20" },
    general: { icon: Hash, label: "Genel", color: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" },
  };
  const { icon: Icon, label, color } = config[type] || config.direct;
  return (
    <Badge variant="secondary" className={cn("gap-1 transition-colors", color)}>
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
        "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group relative overflow-hidden",
        isActive
          ? "bg-primary text-primary-foreground shadow-md"
          : "hover:bg-muted/80"
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar className={cn("h-12 w-12 border-2 shadow-sm transition-colors", isActive ? "border-primary-foreground/20" : "border-background")}>
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
          <span className={cn("font-semibold truncate text-sm", isActive && "text-primary-foreground")}>
            {displayName}
          </span>
          {conversation.last_message && (
            <span className={cn("text-[10px]", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                addSuffix: false,
                locale: tr
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className={cn(
            "text-xs truncate flex-1",
            isActive ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {conversation.last_message?.is_deleted
              ? "Bu mesaj silindi"
              : conversation.last_message?.content || "Henüz mesaj yok"}
          </p>
          {conversation.unread_count > 0 && (
            <Badge className={cn(
              "h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold shadow-sm",
              isActive ? "bg-primary-foreground text-primary animate-pulse" : "bg-primary text-primary-foreground"
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
        "group flex gap-3 max-w-[85%] relative animate-in fade-in slide-in-from-bottom-2 duration-300",
        isOwn ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 flex flex-col justify-end">
        {showAvatar && !isOwn ? (
          <Avatar className="h-8 w-8">
            {message.sender_avatar && (
              <AvatarImage src={BACKEND_URL + message.sender_avatar} />
            )}
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/20 to-primary/5">
              {getInitials(message.sender_name)}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>

      <div className={cn("flex flex-col min-w-0", isOwn ? "items-end" : "items-start")}>
        {/* Sender name */}
        {showName && !isOwn && (
          <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">
            {message.sender_name}
          </span>
        )}

        {/* Reply reference */}
        {message.reply_to && (
          <div className={cn(
            "text-xs px-3 py-2 rounded-xl bg-muted/50 border-l-[3px] border-primary/50 mb-1 max-w-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer",
            isOwn ? "rounded-br-none mr-1" : "rounded-bl-none ml-1"
          )}>
            <span className="font-semibold text-primary block mb-0.5">
              {message.reply_to.sender_name}
            </span>
            <p className="text-muted-foreground truncate line-clamp-1">
              {message.reply_to.is_deleted ? "Bu mesaj silindi" : message.reply_to.content}
            </p>
          </div>
        )}

        {/* Pinned indicator */}
        {message.is_pinned && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mb-1 px-1">
            <Pin className="h-3 w-3 fill-current" />
            <span className="font-medium">Sabitlendi</span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "relative px-4 py-2.5 shadow-sm transition-all",
            message.is_deleted
              ? "bg-muted/30 text-muted-foreground italic rounded-xl border border-dashed"
              : isOwn
                ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                : "bg-card border rounded-2xl rounded-tl-sm",
          )}
        >
          {/* Message content */}
          <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
            {message.content}
          </p>

          {/* File attachment */}
          {message.file && (
            <a
              href={BACKEND_URL + message.file.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-3 mt-3 p-2.5 rounded-xl transition-colors border",
                isOwn 
                  ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20" 
                  : "bg-muted/50 border-border hover:bg-muted"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                isOwn ? "bg-primary-foreground/20" : "bg-background shadow-sm"
              )}>
                {message.file.type?.startsWith("image/") ? (
                  <Image className="h-4 w-4" />
                ) : (
                  <File className="h-4 w-4" />
                )}
              </div>
              <span className="text-sm truncate font-medium">{message.file.name}</span>
            </a>
          )}

          {/* Link previews */}
          {message.link_previews?.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.link_previews.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  className={cn(
                    "block p-2.5 rounded-xl text-sm transition-colors border",
                    isOwn 
                      ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20" 
                      : "bg-muted/30 border-border hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      isOwn ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                    )}>
                      {link.type === "project" && <FolderKanban className="h-4 w-4" />}
                      {link.type === "customer" && <Building2 className="h-4 w-4" />}
                      {link.type === "task" && <ClipboardList className="h-4 w-4" />}
                      {link.type === "file" && <FileText className="h-4 w-4" />}
                      {!["project", "customer", "task", "file"].includes(link.type) && <Link2 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate block">{link.title}</span>
                      {link.subtitle && (
                        <p className="text-[11px] opacity-80 truncate">{link.subtitle}</p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Timestamp & edited */}
          <div className={cn(
            "flex items-center gap-1.5 mt-1.5 select-none",
            isOwn ? "justify-end text-primary-foreground/70" : "justify-start text-muted-foreground/70"
          )}>
            {message.is_edited && !message.is_deleted && (
              <Pencil className="h-2.5 w-2.5 opacity-70" />
            )}
            <span className="text-[10px] font-medium">
              {format(new Date(message.created_at), "HH:mm")}
            </span>
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {Object.entries(groupedReactions).map(([emoji, reactions]) => (
              <TooltipProvider key={emoji}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onReaction(message.id, emoji, userHasReacted(emoji))}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border shadow-sm transition-all",
                        userHasReacted(emoji)
                          ? "bg-primary/10 border-primary/30 text-primary scale-105"
                          : "bg-card border-border hover:bg-muted hover:scale-105"
                      )}
                    >
                      <span>{emoji}</span>
                      <span className="font-semibold">{reactions.length}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p>{reactions.map(r => r.user_name).join(", ")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className={cn(
          "flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 -translate-y-1/2",
          isOwn ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
        )}>
          {/* Actions Container */}
          <div className="flex items-center bg-background border shadow-sm rounded-full p-0.5">
             {/* Emoji picker */}
            <Popover open={showReactions} onOpenChange={setShowReactions}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted">
                  <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1.5" align="center" side="top">
                <div className="flex gap-1">
                  {AVAILABLE_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReaction(message.id, emoji, userHasReacted(emoji));
                        setShowReactions(false);
                      }}
                      className={cn(
                        "p-2 rounded-md hover:bg-muted text-lg transition-transform hover:scale-125",
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
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted" onClick={() => onReply(message)}>
                  <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
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
                  <CommandItem key={p.id} onSelect={() => handleSelect("project", p)} className="gap-2">
                    <FolderKanban className="h-4 w-4 text-green-500" />
                    <span>{p.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">{p.status}</Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {/* ... other groups ... */}
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
  const [newChatType, setNewChatType] = useState("direct");
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
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Refs
  const messagesEndRef = useRef(null);
  const scrollViewportRef = useRef(null); // Ref for the scrollable container
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // --- Layout Fix: Negate Main Padding & Fixed Height ---
  // Dashboard main padding is usually p-6 (1.5rem) or p-8 (2rem). 
  // Header is h-16 (4rem). 
  // We use negative margins to pull the chat container to the edges of the Main area.
  // We calculate height as 100vh - 4rem (header height).
  // This ensures NO window scrollbar, only internal chat scrollbar.
  const layoutClass = "flex h-[calc(100vh-4rem)] -m-6 lg:-m-8 bg-background overflow-hidden relative";

  // Scroll to bottom logic
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
        // Use standard scrollIntoView but ensure container handles it
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeConversation]); // Added activeConversation to scroll when switching

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

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const name = c.name || c.project_name || "";
    const participants = c.participants?.map(p => p.name).join(" ") || "";
    return (name + participants).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const groupedMessages = messages.reduce((acc, msg, idx) => {
    const dateKey = formatMessageDate(msg.created_at);
    if (!acc[dateKey]) acc[dateKey] = [];
    
    const prevMsg = messages[idx - 1];
    const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id || 
      (new Date(msg.created_at) - new Date(prevMsg.created_at)) > 300000;
    const showName = showAvatar;
    
    acc[dateKey].push({ ...msg, showAvatar, showName });
    return acc;
  }, {});

  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setMessageInput(value);
    setCursorPosition(cursorPos);
    
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setShowMentionPicker(true);
      setMentionQuery(mentionMatch[1]);
    } else {
      setShowMentionPicker(false);
      setMentionQuery("");
    }
    
    if (activeConversation) {
      sendTypingIndicator(activeConversation.id, true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(activeConversation.id, false);
      }, 2000);
    }
  };

  const insertMention = (mentionUser) => {
    const textBeforeCursor = messageInput.slice(0, cursorPosition);
    const textAfterCursor = messageInput.slice(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const textBeforeMention = textBeforeCursor.slice(0, -mentionMatch[0].length);
      const newText = `${textBeforeMention}@${mentionUser.full_name} ${textAfterCursor}`;
      setMessageInput(newText);
      setSelectedMentions(prev => [...prev, { id: mentionUser.id, name: mentionUser.full_name }]);
    }
    
    setShowMentionPicker(false);
    setMentionQuery("");
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !activeConversation) return;

    if (editingMessage) {
      await editMessage(editingMessage.id, messageInput);
      setEditingMessage(null);
    } else {
      const mentionIds = selectedMentions.map(m => m.id);
      await sendMessage(activeConversation.id, messageInput, {
        replyToId: replyTo?.id,
        mentions: mentionIds
      });
      setReplyTo(null);
      setSelectedMentions([]);
    }
    setMessageInput("");
  };

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

  const handleResourceSelect = async (resource) => {
    if (!activeConversation) return;
    const content = `📎 ${resource.name}`;
    await sendMessage(activeConversation.id, content, {
      links: [{ type: resource.type, id: resource.id }]
    });
  };

  const handleReaction = async (messageId, emoji, hasReacted) => {
    if (hasReacted) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  };

  const handleCreateConversation = async () => {
    if (newChatUsers.length === 0) return;

    if (newChatType === "direct" && newChatUsers.length === 1) {
      const conv = await createConversation("direct", [newChatUsers[0].id]);
      if (conv) {
        selectConversation(conv);
        resetNewChat();
      }
    } else {
      if (!newGroupName.trim()) return;
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

  const handleUpdateConversation = async () => {
    if (!activeConversation) return;
    await updateConversation(activeConversation.id, {
      name: tempConvName,
      description: tempConvDescription
    });
    setEditingConversation(false);
  };

  const activeTypingUsers = typingUsers[activeConversation?.id] || {};
  const typingUserNames = Object.values(activeTypingUsers).filter(
    name => name !== user?.full_name
  );

  const otherParticipant = activeConversation?.type === "direct"
    ? activeConversation.participants?.find(p => p.id !== user?.id)
    : null;

  return (
    <div className={layoutClass}>
      {/* Sidebar - Fixed width, internal scroll */}
      <div className="w-80 border-r flex flex-col bg-muted/10 shrink-0">
        <div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">Sohbetler</h2>
            <Button size="icon" variant="default" className="rounded-full shadow-md h-8 w-8" onClick={() => setShowNewChat(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Sohbet ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-input/50 focus:bg-background transition-all"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 opacity-50" />
                </div>
                <p className="text-sm font-medium">Sohbet bulunamadı</p>
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

      {/* Main Chat Area - Flexible width, internal scroll */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative z-0">
        {activeConversation ? (
          <>
            {/* Chat Header - Fixed */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-background/95 backdrop-blur z-20 shrink-0">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border shadow-sm">
                  {activeConversation.avatar_url && (
                    <AvatarImage src={BACKEND_URL + activeConversation.avatar_url} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                    {activeConversation.type === "general" ? "#" : 
                     activeConversation.type === "direct" ? getInitials(otherParticipant?.name) :
                     getInitials(activeConversation.name || activeConversation.project_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm leading-none">
                      {activeConversation.type === "direct"
                        ? otherParticipant?.name || "Bilinmiyor"
                        : activeConversation.name || activeConversation.project_name || "Genel Sohbet"}
                    </h3>
                    <ConversationTypeBadge type={activeConversation.type} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeConversation.type === "direct" 
                      ? (otherParticipant?.is_online ? <span className="text-green-600 font-medium">Çevrimiçi</span> : "Çevrimdışı")
                      : `${activeConversation.participants?.length || 0} katılımcı`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-muted"
                onClick={() => {
                  setShowConversationInfo(true);
                  setTempConvName(activeConversation.name || "");
                  setTempConvDescription(activeConversation.description || "");
                }}
              >
                <Info className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>

            {/* Pinned Messages Bar - Clickable with content */}
            {pinnedMessages.length > 0 && (
              <button
                onClick={() => {
                  // Scroll to first pinned message
                  const pinnedMsg = pinnedMessages[0];
                  const msgElement = document.getElementById(`msg-${pinnedMsg.id}`);
                  if (msgElement) {
                    msgElement.scrollIntoView({ behavior: "smooth", block: "center" });
                    msgElement.classList.add("ring-2", "ring-amber-400", "ring-offset-2");
                    setTimeout(() => {
                      msgElement.classList.remove("ring-2", "ring-amber-400", "ring-offset-2");
                    }, 2000);
                  }
                }}
                className="w-full px-6 py-2.5 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 border-b flex items-center gap-3 shrink-0 hover:from-amber-100 hover:to-amber-50 dark:hover:from-amber-950/30 dark:hover:to-amber-900/20 transition-colors cursor-pointer group"
              >
                <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Pin className="h-4 w-4 text-amber-500 fill-current" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Sabitlenmiş Mesaj
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-500/70 truncate">
                    {pinnedMessages[0]?.content || "Mesaj içeriği"}
                  </p>
                </div>
                {pinnedMessages.length > 1 && (
                  <Badge variant="secondary" className="bg-amber-200/50 text-amber-700 dark:bg-amber-800/30 dark:text-amber-400 text-[10px]">
                    +{pinnedMessages.length - 1}
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-amber-500/50 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Messages Area - SCROLLABLE CONTAINER */}
            <div 
                className="flex-1 overflow-y-auto p-6 scroll-smooth overscroll-contain"
                ref={scrollViewportRef}
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in zoom-in-95 duration-500">
                  <div className="h-24 w-24 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 shadow-inner">
                    <MessageSquare className="h-10 w-10 text-primary/40" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">Henüz mesaj yok</h3>
                  <p className="text-sm opacity-70">Sohbeti başlatmak için ilk mesajı gönderin!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date} className="space-y-4">
                      {/* Date divider */}
                      <div className="relative flex items-center justify-center py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <span className="relative bg-background px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border rounded-full shadow-sm">
                          {date}
                        </span>
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
                              inputRef.current?.focus();
                            }}
                            onDelete={deleteMessage}
                            onReply={(m) => {
                              setReplyTo(m);
                              setEditingMessage(null);
                              inputRef.current?.focus();
                            }}
                            onPin={togglePinMessage}
                            onReaction={handleReaction}
                            currentUserId={user?.id}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Invisible div to scroll to */}
                  <div ref={messagesEndRef} className="h-px" />
                </div>
              )}
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="border-t p-4 bg-background z-20 shrink-0">
               {/* Typing Indicator floating above input */}
               {typingUserNames.length > 0 && (
                <div className="absolute -top-8 left-6 flex items-center gap-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-full border shadow-sm backdrop-blur">
                   <div className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="font-medium">{typingUserNames.join(", ")} yazıyor...</span>
                </div>
              )}

              {/* Reply/Edit preview */}
              {(replyTo || editingMessage) && (
                <div className={cn(
                  "flex items-center gap-3 mb-3 p-3 rounded-xl border shadow-sm animate-in slide-in-from-bottom-2",
                  editingMessage ? "bg-primary/5 border-primary/20" : "bg-muted/50"
                )}>
                  {editingMessage ? (
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Pencil className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Reply className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-xs font-bold block mb-0.5", editingMessage ? "text-primary" : "text-foreground")}>
                      {editingMessage ? "Mesajı Düzenle" : replyTo.sender_name}
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
                    className="h-8 w-8 rounded-full hover:bg-background"
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

              <div className="flex items-end gap-2 bg-muted/30 p-2 rounded-[24px] border focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-background shadow-none"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>

                <Popover open={showResourcePicker} onOpenChange={setShowResourcePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-background shadow-none">
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

                <div className="flex-1 relative py-1">
                  {/* @mention picker */}
                  {showMentionPicker && (
                    <div className="absolute bottom-full left-0 mb-4 w-64 bg-popover border rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-bottom-2">
                      <div className="p-2 border-b bg-muted/30">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <AtSign className="h-3.5 w-3.5" />
                          Kullanıcı Etiketle
                        </p>
                      </div>
                      <ScrollArea className="max-h-48">
                        {mentionLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        ) : mentionResults.length > 0 ? (
                          <div className="p-1">
                            {mentionResults.map(u => (
                              <button
                                key={u.id}
                                onClick={() => insertMention(u)}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground text-left transition-colors"
                              >
                                <Avatar className="h-6 w-6">
                                  {u.avatar_url && <AvatarImage src={BACKEND_URL + u.avatar_url} />}
                                  <AvatarFallback className="text-[10px]">{getInitials(u.full_name)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{u.full_name}</span>
                              </button>
                            ))}
                          </div>
                        ) : mentionQuery ? (
                          <p className="text-center py-4 text-xs text-muted-foreground">
                            Kullanıcı bulunamadı
                          </p>
                        ) : (
                          <p className="text-center py-4 text-xs text-muted-foreground">
                            @ yazarak başlayın
                          </p>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                  
                  <Input
                    ref={inputRef}
                    placeholder="Mesaj yazın... (@ile etiketleyin)"
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (showMentionPicker && e.key === "Escape") {
                        setShowMentionPicker(false);
                        return;
                      }
                      if (e.key === "Enter" && !e.shiftKey && !showMentionPicker) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="border-0 shadow-none bg-transparent px-2 h-auto py-2 focus-visible:ring-0 placeholder:text-muted-foreground/50 min-h-[40px]"
                  />
                </div>

                <Button
                  onClick={handleSend}
                  disabled={!messageInput.trim()}
                  className={cn(
                    "rounded-full h-10 w-10 shrink-0 transition-all duration-200",
                    messageInput.trim() ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted"
                  )}
                  size="icon"
                >
                  <Send className="h-4 w-4 ml-0.5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in duration-500">
            <div className="relative mb-8 group cursor-pointer" onClick={() => setShowNewChat(true)}>
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-all duration-500" />
                <div className="h-32 w-32 rounded-[2rem] bg-gradient-to-br from-background to-muted border shadow-xl flex items-center justify-center relative z-10 group-hover:scale-105 transition-transform duration-300">
                    <MessageSquare className="h-16 w-16 text-primary/80" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-background p-1.5 rounded-full shadow-lg border">
                    <Plus className="h-6 w-6 text-primary" />
                </div>
            </div>
            
            <h3 className="text-2xl font-bold text-foreground mb-3">Sohbetler</h3>
            <p className="text-sm max-w-[280px] text-center text-muted-foreground/80 leading-relaxed">
              Ekip arkadaşlarınızla iletişime geçmek için soldan bir sohbet seçin veya yeni başlatın.
            </p>
            
            <div className="mt-8 flex gap-4">
                <Button variant="outline" className="gap-2" onClick={() => setShowNewChat(true)}>
                    <Users className="h-4 w-4" />
                    Yeni Grup
                </Button>
                <Button className="gap-2" onClick={() => setShowNewChat(true)}>
                    <Plus className="h-4 w-4" />
                    Yeni Mesaj
                </Button>
            </div>
          </div>
        )}
      </div>

      {/* --- Dialogs & Sheets (Keep existing structure, updated styles if needed) --- */}
      {/* Conversation Info Sheet */}
      <Sheet open={showConversationInfo} onOpenChange={setShowConversationInfo}>
        <SheetContent className="w-[400px] sm:w-[540px]">
           {/* ... Content remains same but styles fit the new theme automatically ... */}
          <SheetHeader>
            <SheetTitle>Sohbet Bilgileri</SheetTitle>
            <SheetDescription>
              Sohbet ayarları ve katılımcı yönetimi
            </SheetDescription>
          </SheetHeader>

          {activeConversation && (
            <div className="mt-6 space-y-6">
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
                  <div className="mt-4 w-full space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Input
                      value={tempConvName}
                      onChange={(e) => setTempConvName(e.target.value)}
                      placeholder="Grup adı"
                      className="text-center font-semibold"
                    />
                    <Textarea
                      value={tempConvDescription}
                      onChange={(e) => setTempConvDescription(e.target.value)}
                      placeholder="Açıklama"
                      rows={2}
                      className="resize-none"
                    />
                    <div className="flex gap-2 justify-center">
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
                    <h3 className="mt-4 text-xl font-bold tracking-tight text-center">
                      {activeConversation.type === "direct"
                        ? otherParticipant?.name
                        : activeConversation.name || activeConversation.project_name || "Genel Sohbet"}
                    </h3>
                    {activeConversation.description && (
                      <p className="text-sm text-muted-foreground mt-1 text-center max-w-[80%]">{activeConversation.description}</p>
                    )}
                    <div className="mt-2">
                        <ConversationTypeBadge type={activeConversation.type} />
                    </div>
                    
                    {(activeConversation.type === "group") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4 h-8"
                        onClick={() => setEditingConversation(true)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Düzenle
                      </Button>
                    )}
                  </>
                )}
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h4 className="font-semibold text-sm">Katılımcılar ({activeConversation.participants?.length || 0})</h4>
                  {activeConversation.type === "group" && (
                    <Button size="sm" variant="ghost" className="h-8 hover:bg-muted" onClick={() => setShowAddMember(true)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Ekle
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[240px] border rounded-xl p-2 bg-muted/10">
                  <div className="space-y-1">
                    {activeConversation.participants?.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-background hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-9 w-9 border shadow-sm">
                              {p.avatar_url && <AvatarImage src={BACKEND_URL + p.avatar_url} />}
                              <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                            </Avatar>
                            {p.is_online && (
                              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm leading-none mb-1">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.is_online ? "Çevrimiçi" : "Çevrimdışı"}
                            </p>
                          </div>
                        </div>
                        {activeConversation.type === "group" && p.id !== user?.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={newChatType === "direct" ? "secondary" : "ghost"}
                className={cn("flex-1 shadow-sm", newChatType !== "direct" && "shadow-none hover:bg-background/50")}
                onClick={() => {
                  setNewChatType("direct");
                  setNewChatUsers([]);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Bireysel
              </Button>
              <Button
                variant={newChatType === "group" ? "secondary" : "ghost"}
                className={cn("flex-1 shadow-sm", newChatType !== "group" && "shadow-none hover:bg-background/50")}
                onClick={() => setNewChatType("group")}
              >
                <Users className="h-4 w-4 mr-2" />
                Grup
              </Button>
            </div>

            {/* Group name input */}
            {newChatType === "group" && (
              <div className="space-y-3 animate-in slide-in-from-top-2">
                <div>
                  <Label>Grup Adı *</Label>
                  <Input
                    placeholder="Grup adı girin..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Açıklama</Label>
                  <Textarea
                    placeholder="Grup açıklaması (opsiyonel)"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={2}
                    className="mt-1 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Selected users */}
            {newChatUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-muted/20">
                {newChatUsers.map(u => (
                  <Badge key={u.id} variant="secondary" className="gap-1 py-1 pl-1 pr-2">
                    <Avatar className="h-5 w-5">
                      {u.avatar_url && <AvatarImage src={BACKEND_URL + u.avatar_url} />}
                      <AvatarFallback className="text-[10px]">{getInitials(u.full_name)}</AvatarFallback>
                    </Avatar>
                    {u.full_name}
                    <button
                      onClick={() => setNewChatUsers(prev => prev.filter(p => p.id !== u.id))}
                      className="ml-1 hover:text-destructive transition-colors p-0.5 rounded-full hover:bg-destructive/10"
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
                          "w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                          isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
                        )}
                      >
                        <Avatar className="h-9 w-9 border shadow-sm">
                          {u.avatar_url && <AvatarImage src={BACKEND_URL + u.avatar_url} />}
                          <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{u.full_name}</span>
                        {isSelected && (
                          <div className="ml-auto bg-primary rounded-full p-0.5">
                              <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : userSearchQuery ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  Kullanıcı bulunamadı
                </p>
              ) : (
                <p className="text-center py-8 text-muted-foreground text-sm">
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
              className="px-6"
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