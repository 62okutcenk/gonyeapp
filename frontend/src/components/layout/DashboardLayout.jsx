import { useState, useEffect, useMemo } from "react";
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
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

// Menü tanımları - yetki anahtarları eklendi
const navigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard, permission: null }, // Herkes görebilir
  { name: "Projeler", href: "/projects", icon: FolderKanban, permission: "projects.view" },
  { name: "Kullanıcılar", href: "/users", icon: Users, permission: "users.view" },
];

const setupNavigation = [
  { name: "Gruplar & Alt Görevler", href: "/setup/groups", icon: Layers, permission: "setup.groups" },
  { name: "İş Kalemleri", href: "/setup/workitems", icon: Package, permission: "setup.workitems" },
  { name: "Roller & Yetkiler", href: "/setup/roles", icon: Shield, permission: "setup.roles" },
  { name: "Firma Ayarları", href: "/setup/settings", icon: Building2, permission: "settings.manage" },
];

// NavItem Component
const NavItem = ({ item, onClick, isCollapsed, isChild }) => (
  <NavLink
    to={item.href}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        "group flex items-center gap-3 rounded-lg py-2 transition-all duration-300 min-h-[40px]",
        isCollapsed ? "justify-center px-2" : "px-3",
        isChild && !isCollapsed && "pl-9", // Child indentation
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )
    }
    title={isCollapsed ? item.name : undefined}
  >
    <item.icon className={cn("shrink-0 transition-all", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
    <span
      className={cn(
        "whitespace-nowrap overflow-hidden transition-all duration-300 text-sm font-medium", // Font size fixed here
        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
      )}
    >
      {item.name}
    </span>
  </NavLink>
);

const Sidebar = ({ onNavClick, tenant, isDark, isCollapsed, toggleSidebar, isMobile }) => {
  const { hasPermission } = useAuth(); // Auth context'ten yetki fonksiyonunu al
  const [setupOpen, setSetupOpen] = useState(true);

  // Yetkiye göre filtrelenmiş menüler
  const filteredNav = useMemo(() => {
    return navigation.filter(item => !item.permission || hasPermission(item.permission));
  }, [hasPermission]);

  const filteredSetupNav = useMemo(() => {
    return setupNavigation.filter(item => !item.permission || hasPermission(item.permission));
  }, [hasPermission]);

  const logoUrl = isDark ? tenant?.dark_logo_url : tenant?.light_logo_url;
  const fallbackLogo = isDark ? tenant?.light_logo_url : tenant?.dark_logo_url;
  const displayLogo = logoUrl || fallbackLogo;

  const getCompanyInitials = (name) => {
    if (!name) return "CF";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSetupClick = () => {
    if (isCollapsed && toggleSidebar) {
      toggleSidebar();
      setSetupOpen(true);
    } else {
      setSetupOpen(!setupOpen);
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-card/50">
      
      {/* Toggle Button - On the Line (Desktop Only) */}
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-md transition-colors hover:bg-accent focus:outline-none"
        >
          <ChevronLeft
            className={cn("h-3 w-3 transition-transform duration-300", isCollapsed && "rotate-180")}
          />
        </button>
      )}

      {/* Header / Logo Area */}
      <div className={cn(
        "flex h-16 shrink-0 items-center border-b transition-all duration-300",
        isCollapsed ? "justify-center px-2" : "px-4 justify-between"
      )}>
        <div className={cn("flex items-center gap-3 overflow-hidden w-full h-full", isCollapsed ? "justify-center" : "")}>
          {displayLogo ? (
            <div className={cn("relative flex items-center justify-start transition-all duration-300 h-full w-full")}>
              <img 
                src={displayLogo} 
                alt={tenant?.name || "Logo"} 
                className={cn(
                  "object-contain transition-all duration-300",
                  // Logo expanded: h-10 to h-14 for bigger look
                  isCollapsed 
                    ? "h-8 w-8 object-center" 
                    : "h-10 max-w-full object-left" 
                )}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
               <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary-foreground">
                  {getCompanyInitials(tenant?.name)}
                </span>
              </div>
              {!isCollapsed && (
                 <span className="font-semibold text-sm tracking-tight truncate">
                   {tenant?.name || "CraftForge"}
                 </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Scroll Area */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {filteredNav.map((item) => (
            <NavItem 
              key={item.href} 
              item={item} 
              onClick={onNavClick} 
              isCollapsed={isCollapsed} 
            />
          ))}

          {/* Setup Section - Accordion Style */}
          {/* Sadece alt elemanlardan en az biri görünürse başlığı göster */}
          {filteredSetupNav.length > 0 && (
            <>
              {/* Separator */}
              <div className="my-4 h-px bg-border/50 mx-2" />
              
              <div>
                <button
                  onClick={handleSetupClick}
                  className={cn(
                    "group flex w-full items-center rounded-lg py-2 transition-all duration-300 min-h-[40px]",
                    isCollapsed ? "justify-center px-2" : "justify-between px-3 hover:bg-muted"
                  )}
                  title={isCollapsed ? "Kurulum" : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Settings className={cn("shrink-0 transition-all", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                    <span className={cn(
                      "whitespace-nowrap overflow-hidden transition-all duration-300 text-sm font-medium",
                      isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}>
                      Kurulum
                    </span>
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 text-muted-foreground transition-transform duration-200",
                        setupOpen && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {/* Sub Menu Container */}
                <div 
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    setupOpen && !isCollapsed ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="mt-1 flex flex-col gap-1 pb-2">
                      {filteredSetupNav.map((item) => (
                        <NavItem 
                          key={item.href} 
                          item={item} 
                          onClick={onNavClick}
                          isCollapsed={isCollapsed}
                          isChild={true} // Add indentation
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </nav>
      </ScrollArea>
    </div>
  );
};

// ... (NotificationItem component stays the same) ...
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const fetchTenant = async () => {
    try {
      const response = await axios.get(`${API_URL}/tenant`);
      setTenant(response.data);
    } catch (error) {
      console.error("Failed to fetch tenant:", error);
    }
  };

  useEffect(() => {
    fetchTenant();
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState) setIsSidebarCollapsed(JSON.parse(savedState));
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSidebarToggle = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  const getInitials = (name) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden border-r bg-background transition-all duration-300 lg:block",
          isSidebarCollapsed ? "w-[70px]" : "w-64" // Slightly wider collapsed state for better icon centering
        )}
        style={{ overflow: 'visible' }} // Important for the toggle button to be visible
      >
        <Sidebar 
          tenant={tenant} 
          isDark={isDark} 
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={handleSidebarToggle}
          isMobile={false}
        />
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:hidden">
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
              isCollapsed={false}
              isMobile={true}
            />
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex justify-center">
            {tenant?.light_logo_url && (
                <img 
                    src={isDark ? tenant.dark_logo_url : tenant.light_logo_url} 
                    alt="Logo" 
                    className="h-8 object-contain"
                />
            )}
        </div>

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>

      {/* Main Content Area */}
      <div 
        className={cn(
          "transition-all duration-300 min-h-screen flex flex-col",
          isSidebarCollapsed ? "lg:pl-[70px]" : "lg:pl-64"
        )}
      >
        {/* Desktop Header */}
        <header className="sticky top-0 z-40 hidden h-16 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur px-6 lg:flex">
            <div className="flex items-center gap-2">
                {/* Breadcrumbs placeholder */}
            </div>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                {/* Notifications */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                                    {unreadCount}
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                         <div className="p-3 border-b"><h4 className="font-semibold text-sm">Bildirimler</h4></div>
                         <ScrollArea className="max-h-80">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">Bildirim yok</div>
                            ) : (
                                notifications.slice(0,5).map(n => <NotificationItem key={n.id} notification={n} onMarkRead={markAsRead} />)
                            )}
                         </ScrollArea>
                    </PopoverContent>
                </Popover>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 pl-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback style={{ backgroundColor: user?.color || "#4a4036" }} className="text-white text-xs">
                          {getInitials(user?.full_name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm font-medium">{user?.full_name}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{user?.full_name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}