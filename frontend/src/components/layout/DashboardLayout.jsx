import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  Layers,
  Package,
  Shield,
  Building2,
  Bell,
  Menu,
  LogOut,
  ChevronDown,
  Check,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const navigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projeler", href: "/projects", icon: FolderKanban },
  { name: "Kullanıcılar", href: "/users", icon: Users },
];

const setupNavigation = [
  { name: "Gruplar & Alt Görevler", href: "/setup/groups", icon: Layers },
  { name: "İş Kalemleri", href: "/setup/workitems", icon: Package },
  { name: "Roller & Yetkiler", href: "/setup/roles", icon: Shield },
  { name: "Firma Ayarları", href: "/setup/settings", icon: Building2 },
];

const NavItem = ({ item, onClick }) => (
  <NavLink
    to={item.href}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )
    }
  >
    <item.icon className="h-5 w-5" />
    {item.name}
  </NavLink>
);

const Sidebar = ({ onNavClick, tenant, isDark }) => {
  const [setupOpen, setSetupOpen] = useState(true);

  // Determine which logo to show
  const logoUrl = isDark ? tenant?.dark_logo_url : tenant?.light_logo_url;
  const fallbackLogo = isDark ? tenant?.light_logo_url : tenant?.dark_logo_url;
  const displayLogo = logoUrl || fallbackLogo;

  // Get initials for fallback avatar
  const getCompanyInitials = (name) => {
    if (!name) return "CF";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-3">
          {displayLogo ? (
            <img 
              src={displayLogo} 
              alt={tenant?.name || "Logo"} 
              className="h-8 max-w-[150px] object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
              }}
            />
          ) : null}
          {/* Fallback: Company initials avatar */}
          <div 
            className={cn(
              "h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0",
              displayLogo && "hidden"
            )}
            style={{ display: displayLogo ? 'none' : 'flex' }}
          >
            <span className="text-sm font-bold text-primary-foreground">
              {getCompanyInitials(tenant?.name)}
            </span>
          </div>
          <span className={cn(
            "font-semibold text-base tracking-tight truncate max-w-[130px]",
            displayLogo && "hidden"
          )}>
            {tenant?.name || "CraftForge"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => (
            <NavItem key={item.href} item={item} onClick={onNavClick} />
          ))}

          {/* Setup Section */}
          <div className="mt-6">
            <button
              onClick={() => setSetupOpen(!setupOpen)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <span className="flex items-center gap-3">
                <Settings className="h-5 w-5" />
                Kurulum
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  setupOpen && "rotate-180"
                )}
              />
            </button>

            {setupOpen && (
              <div className="mt-1 ml-4 flex flex-col gap-1 border-l pl-4">
                {setupNavigation.map((item) => (
                  <NavItem key={item.href} item={item} onClick={onNavClick} />
                ))}
              </div>
            )}
          </div>
        </nav>
      </ScrollArea>
    </div>
  );
};

const NotificationItem = ({ notification, onMarkRead, onClick }) => {
  return (
    <div
      className={cn(
        "p-3 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-muted/80",
        !notification.is_read && "bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{notification.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            {new Date(notification.created_at).toLocaleString("tr-TR")}
          </p>
        </div>
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    try {
      const response = await axios.get(`${API_URL}/tenant`);
      setTenant(response.data);
    } catch (error) {
      console.error("Failed to fetch tenant:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r bg-background lg:block">
        <Sidebar tenant={tenant} isDark={isDark} />
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar onNavClick={() => setMobileMenuOpen(false)} tenant={tenant} isDark={isDark} />
          </SheetContent>
        </Sheet>

        <div className="flex-1" />

        {/* Theme Toggle - Mobile */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Mobile Notifications - Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="flex items-center justify-between p-3 border-b">
              <h4 className="font-semibold text-sm">Bildirimler</h4>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={markAllAsRead}
                >
                  Tümünü Oku
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-72">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Henüz bildirim yok
                  </p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markAsRead}
                    onClick={() => {
                      if (notification.link) {
                        navigate(notification.link);
                      }
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                  />
                ))
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  style={{ backgroundColor: user?.color || "#4a4036" }}
                  className="text-white text-xs"
                >
                  {getInitials(user?.full_name || "U")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.full_name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Desktop Header */}
        <header className="sticky top-0 z-40 hidden h-16 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 lg:flex">
          <div />

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              data-testid="theme-toggle-button"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Notifications - Desktop Dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="notifications-button">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-3 border-b">
                  <h4 className="font-semibold text-sm">Bildirimler</h4>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={markAllAsRead}
                    >
                      Tümünü Oku
                    </Button>
                  )}
                </div>
                <ScrollArea className="max-h-80">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Henüz bildirim yok
                      </p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markAsRead}
                        onClick={() => {
                          if (notification.link) {
                            navigate(notification.link);
                          }
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                        }}
                      />
                    ))
                  )}
                </ScrollArea>
                {notifications.length > 5 && (
                  <div className="p-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => navigate("/notifications")}
                    >
                      Tüm bildirimleri gör ({notifications.length})
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2" data-testid="user-menu-button">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      style={{ backgroundColor: user?.color || "#4a4036" }}
                      className="text-white text-xs"
                    >
                      {getInitials(user?.full_name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{user?.full_name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.full_name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
                  <LogOut className="mr-2 h-4 w-4" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
