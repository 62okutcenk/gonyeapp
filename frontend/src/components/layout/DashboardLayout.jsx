import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ChevronLeft,
  ChevronRight,
  Briefcase,
  CreditCard,
  Crown,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Nav groups will be dynamically generated based on user role
const getNavGroups = (isAdmin) => {
  const groups = [
    {
      title: "GENEL",
      items: [
        { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
        { name: "Projeler", href: "/projects", icon: FolderKanban },
      ]
    },
    {
      title: "YÖNETİM",
      items: [
        { name: "Kullanıcılar", href: "/users", icon: Users },
      ]
    },
    {
      title: "SİSTEM AYARLARI",
      items: [
        { name: "Gruplar & Alt Görevler", href: "/setup/groups", icon: Layers },
        { name: "İş Kalemleri", href: "/setup/workitems", icon: Package },
        { name: "Roller & Yetkiler", href: "/setup/roles", icon: Shield },
        { name: "Firma Ayarları", href: "/setup/settings", icon: Building2 },
      ]
    }
  ];

  // Add subscription menu only for admin
  if (isAdmin) {
    groups.push({
      title: "ABONELİK",
      items: [
        { name: "Abonelik Bilgileriniz", href: "/subscription", icon: Crown },
      ]
    });
  }

  return groups;
};

const NavItem = ({ item, onClick, collapsed }) => {
  if (collapsed) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to={item.href}
              onClick={onClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <item.icon className="h-5 w-5 shrink-0" />
      <span>{item.name}</span>
    </NavLink>
  );
};

const Sidebar = ({ onNavClick, tenant, isDark, collapsed, onToggleCollapse, user, pendingTasks }) => {
  
  // Logo Mantığı: Koyu modda dark logo varsa onu kullan, yoksa light logoyu kullan (fallback).
  const logoUrl = isDark && tenant?.dark_logo_url 
    ? tenant.dark_logo_url 
    : (tenant?.light_logo_url || null);

  const getCompanyInitials = (name) => {
    if (!name) return "CF";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getInitials = (name) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarUrl = () => {
    if (!user?.avatar_url) return null;
    return user.avatar_url.startsWith("http") ? user.avatar_url : BACKEND_URL + user.avatar_url;
  };

  return (
    <div className="flex h-full flex-col gap-2 relative bg-background border-r">
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapse}
        className="absolute -right-3 top-8 z-50 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-muted transition-all duration-300 hover:scale-110"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6 shrink-0">
        <div className={cn(
          "flex items-center gap-3 transition-all duration-700",
          collapsed && "justify-center w-full"
        )}>
          {logoUrl && !collapsed ? (
            <img 
              src={logoUrl} 
              alt={tenant?.name || "Logo"} 
              className="h-10 max-w-[180px] w-auto object-contain transition-all duration-700"
              style={{ maxHeight: '40px' }}
            />
          ) : (
            <>
              {/* Logo yoksa veya collapsed ise baş harfler */}
              <div 
                className={cn(
                  "h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0 transition-all duration-700",
                  logoUrl && !collapsed && "hidden"
                )}
              >
                <span className="text-base font-bold text-primary-foreground">
                  {getCompanyInitials(tenant?.name)}
                </span>
              </div>
              
              {!collapsed && !logoUrl && (
                <span className="font-semibold text-base tracking-tight truncate max-w-[130px]">
                  {tenant?.name || "CraftForge"}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {getNavGroups(user?.is_admin).map((group, index) => (
            <div key={index} className="mb-4 last:mb-0">
              {/* Grup Başlığı */}
              {!collapsed && (
                <h4 className="text-[11px] uppercase font-bold text-muted-foreground/70 tracking-wider mb-2 px-3 mt-2">
                  {group.title}
                </h4>
              )}
              {collapsed && index > 0 && <div className="my-2 border-t border-border/40 mx-2" />}
              
              {/* Grup Linkleri */}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <NavItem key={item.href} item={item} onClick={onNavClick} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* USER FOOTER SECTION */}
      <div className="p-3 mt-auto border-t bg-muted/10">
          <NavLink 
            to="/profile"
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-muted/80 cursor-pointer group border border-transparent hover:border-border",
              collapsed && "justify-center"
            )}
          >
             <div className="relative shrink-0">
               <Avatar className="h-10 w-10 border-2 border-background shadow-sm group-hover:border-primary/20 transition-colors">
                 <AvatarImage src={getAvatarUrl()} className="object-cover" />
                 <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {getInitials(user?.full_name)}
                 </AvatarFallback>
               </Avatar>
               {/* Online/Status Indicator */}
               <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-background"></span>
               </span>
             </div>
             
             {!collapsed && (
               <div className="flex flex-col overflow-hidden transition-all duration-300 min-w-0">
                 <span className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                    {user?.full_name}
                 </span>
                 <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                   <Briefcase className="h-3 w-3" />
                   <span className="truncate">
                     {pendingTasks > 0 ? (
                       <span className="text-amber-600 font-medium">{pendingTasks} Görev Bekliyor</span>
                     ) : (
                       <span className="text-emerald-600">Her şey yolunda</span>
                     )}
                   </span>
                 </div>
               </div>
             )}
          </NavLink>
       </div>
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

const ThemeSwitch = ({ isDark, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-500 ease-in-out shadow-sm hover:shadow-md",
        isDark ? "bg-slate-700" : "bg-amber-400"
      )}
      aria-label="Toggle theme"
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md transform transition-all duration-700 ease-out",
          isDark ? "translate-x-6" : "translate-x-1"
        )}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-slate-700 transition-transform duration-500 rotate-0" />
        ) : (
          <Sun className="h-3 w-3 text-amber-500 transition-transform duration-500 rotate-0" />
        )}
      </span>
      
      {/* Efektler */}
      <div className={cn(
        "absolute left-1.5 flex gap-0.5 transition-opacity duration-700",
        isDark ? "opacity-100" : "opacity-0"
      )}>
        <span className="text-amber-200 text-[10px]">✦</span>
        <span className="text-amber-300 text-[6px] mt-0.5">✦</span>
      </div>
      
      <div className={cn(
        "absolute right-1.5 flex gap-0.5 transition-opacity duration-700",
        !isDark ? "opacity-100" : "opacity-0"
      )}>
        <span className="text-amber-600 text-[10px]">✺</span>
        <span className="text-amber-500 text-[6px] mt-0.5">✺</span>
      </div>
    </button>
  );
};

const CurrentTime = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-sm font-medium text-muted-foreground tabular-nums">
      {time.toLocaleTimeString("tr-TR", { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })}
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingTaskCount, setPendingTaskCount] = useState(0);

  const fetchData = async () => {
    try {
      const [tenantRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/tenant`),
        axios.get(`${API_URL}/tasks/me`) // Kullanıcının görevlerini çek
      ]);
      setTenant(tenantRes.data);
      
      // Tamamlanmamış görev sayısını hesapla
      const pending = tasksRes.data.filter(t => t.status !== 'tamamlandi').length;
      setPendingTaskCount(pending);
    } catch (error) {
      console.error("Layout data fetch error:", error);
    }
  };

  useEffect(() => {
    fetchData();
    // Periyodik olarak güncellemek istersen:
    // const interval = setInterval(fetchData, 60000);
    // return () => clearInterval(interval);
  }, []); // Bağımlılık dizisi boş, sayfa yüklendiğinde çalışır. Route değişiminde tetiklenmesi için [location.pathname] eklenebilir.

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarUrl = () => {
    if (!user?.avatar_url) return null;
    return user.avatar_url.startsWith("http") ? user.avatar_url : BACKEND_URL + user.avatar_url;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 hidden border-r bg-background lg:block transition-all duration-700 ease-in-out",
        sidebarCollapsed ? "w-20" : "w-64"
      )}>
        <Sidebar 
          tenant={tenant} 
          isDark={isDark} 
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          user={user}
          pendingTasks={pendingTaskCount}
        />
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
            <Sidebar 
              onNavClick={() => setMobileMenuOpen(false)} 
              tenant={tenant} 
              isDark={isDark}
              collapsed={false}
              user={user}
              pendingTasks={pendingTaskCount}
            />
          </SheetContent>
        </Sheet>

        <div className="flex-1" />
        <ThemeSwitch isDark={isDark} onToggle={toggleTheme} />
        
        {/* Mobile Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Avatar className="h-8 w-8">
                <AvatarImage src={getAvatarUrl()} className="object-cover" />
                <AvatarFallback style={{ backgroundColor: user?.color || "#4a4036" }} className="text-white text-xs">
                  {getInitials(user?.full_name || "U")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.full_name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
                <Users className="mr-2 h-4 w-4" /> Profilim
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-700 ease-in-out",
        sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
      )}>
        {/* Desktop Header */}
        <header className="sticky top-0 z-40 hidden h-16 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 lg:flex">
          <div />

          <div className="flex items-center gap-4">
            <CurrentTime />
            <ThemeSwitch isDark={isDark} onToggle={toggleTheme} />

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="notifications-button">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-3 border-b">
                  <h4 className="font-semibold text-sm">Bildirimler</h4>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                      Tümünü Oku
                    </Button>
                  )}
                </div>
                <ScrollArea className="max-h-80">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">Henüz bildirim yok</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markAsRead}
                        onClick={() => {
                          if (notification.link) navigate(notification.link);
                          if (!notification.is_read) markAsRead(notification.id);
                        }}
                      />
                    ))
                  )}
                </ScrollArea>
                {notifications.length > 5 && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate("/notifications")}>
                      Tüm bildirimleri gör ({notifications.length})
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* User Menu with Avatar */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-2" data-testid="user-menu-button">
                    <Avatar className="h-8 w-8 border border-muted">
                      <AvatarImage src={getAvatarUrl()} className="object-cover" />
                      <AvatarFallback style={{ backgroundColor: user?.color || "#4a4036" }} className="text-white text-xs">
                        {getInitials(user?.full_name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium">{user?.full_name}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user?.full_name}</span>
                      <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <Users className="mr-2 h-4 w-4" /> Profilim
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
                    <LogOut className="mr-2 h-4 w-4" /> Çıkış Yap
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