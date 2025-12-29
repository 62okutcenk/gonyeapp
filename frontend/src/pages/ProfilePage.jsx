import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext"; // Tema desteği eklendi
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Shield,
  User,
  Loader2,
  Briefcase,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Calendar,
  FileText,
  Upload,
  ExternalLink
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme(); // Koyu mod kontrolü
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [roles, setRoles] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    color: "#4a4036",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        color: user.color || "#4a4036",
      });
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantRes, tasksRes, rolesRes] = await Promise.all([
        axios.get(`${API_URL}/tenant`),
        axios.get(`${API_URL}/tasks/me`),
        axios.get(`${API_URL}/roles`)
      ]);
      
      setTenant(tenantRes.data);
      setMyTasks(tasksRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error("Veri yükleme hatası:", error);
      toast.error("Profil bilgileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Backend update
      await axios.put(`${API_URL}/users/${user.id}`, {
        full_name: formData.full_name,
        color: formData.color
      });
      
      // Context update
      updateUser({
        full_name: formData.full_name,
        color: formData.color
      });
      
      toast.success("Profil güncellendi");
    } catch (error) {
      toast.error("Güncelleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    try {
        toast.info("Avatar yükleniyor...");
        const res = await axios.post(`${API_URL}/users/me/avatar`, fd, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        updateUser({ avatar_url: res.data.avatar_url });
        toast.success("Avatar güncellendi");
    } catch (error) {
        toast.error("Avatar yüklenirken hata oluştu");
    }
  };

  const getInitials = (name) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || "Kullanıcı";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "tamamlandi": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "montaj": return "text-blue-600 bg-blue-50 border-blue-200";
      case "uretimde": return "text-amber-600 bg-amber-50 border-amber-200";
      default: return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  const getAvatarUrl = () => {
    if (!user?.avatar_url) return null;
    return user.avatar_url.startsWith("http") ? user.avatar_url : BACKEND_URL + user.avatar_url;
  };

  // İstatistikler
  const totalTasks = myTasks.length;
  const completedTasks = myTasks.filter(t => t.status === "tamamlandi").length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Logo URL Mantığı: Koyu moddaysa ve dark logo varsa onu kullan
  const companyLogoUrl = isDark && tenant?.dark_logo_url 
    ? tenant.dark_logo_url 
    : (tenant?.light_logo_url || null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-slide-in pb-10" data-testid="profile-page">
      
      {/* Header Profile Section */}
      <div className="relative">
        {/* Banner/Background */}
        <div 
            className="h-48 rounded-xl w-full bg-gradient-to-r from-primary/90 to-primary/70 relative overflow-hidden"
            style={{ backgroundColor: user?.color }}
        >
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* User Info Card */}
        <div className="px-6 sm:px-10 relative -mt-16 flex flex-col sm:flex-row items-end sm:items-center gap-6">
            <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={getAvatarUrl()} className="object-cover" />
                    <AvatarFallback className="text-4xl bg-muted text-muted-foreground">
                        {getInitials(user?.full_name)}
                    </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-2 right-2 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:scale-110 transition-transform shadow-sm">
                    <Upload className="h-4 w-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
            </div>
            
            <div className="flex-1 pb-2">
                <h1 className="text-3xl font-bold text-foreground">{user?.full_name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-sm">
                        <Mail className="h-4 w-4" /> {user?.email}
                    </span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" /> {getRoleName(user?.role_id)}
                    </Badge>
                </div>
            </div>

            <div className="flex gap-3 pb-2 w-full sm:w-auto">
                <Card className="flex-1 sm:w-32 bg-card/50 backdrop-blur-sm border-muted">
                    <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold">{totalTasks}</div>
                        <div className="text-xs text-muted-foreground">Toplam Görev</div>
                    </CardContent>
                </Card>
                <Card className="flex-1 sm:w-32 bg-card/50 backdrop-blur-sm border-muted">
                    <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-emerald-600">{completedTasks}</div>
                        <div className="text-xs text-muted-foreground">Tamamlanan</div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SOL KOLON: Şirket Bilgileri & Profil Ayarları */}
        <div className="space-y-6">
            
            {/* Şirket Kartı */}
            <Card className="overflow-hidden border-t-4 border-t-primary shadow-sm">
                <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                        Şirket Bilgileri
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="flex flex-col items-center text-center">
                        {companyLogoUrl ? (
                            <img src={companyLogoUrl} alt={tenant.name} className="h-16 object-contain mb-3 transition-all duration-300" />
                        ) : (
                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-3">
                                <Building2 className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                        )}
                        <h3 className="font-bold text-xl">{tenant?.name}</h3>
                        <p className="text-sm text-muted-foreground">{tenant?.city || "Şehir Belirtilmemiş"}</p>
                    </div>

                    <Separator />

                    <div className="space-y-4 text-sm">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                                <p className="font-medium text-foreground">Adres</p>
                                <p className="text-muted-foreground">{tenant?.address || "-"}</p>
                                <p className="text-muted-foreground">{tenant?.district && `${tenant.district},`} {tenant?.city}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="font-medium text-foreground">Telefon</p>
                                <p className="text-muted-foreground">{tenant?.phone || "-"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="font-medium text-foreground">E-posta</p>
                                <p className="text-muted-foreground">{tenant?.contact_email || "-"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="font-medium text-foreground">Vergi Dairesi / No</p>
                                <p className="text-muted-foreground">{tenant?.tax_office || "-"} / {tenant?.tax_number || "-"}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Profil Düzenleme */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" /> Profil Ayarları
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Ad Soyad</Label>
                            <Input 
                                id="full_name" 
                                value={formData.full_name} 
                                onChange={(e) => setFormData(p => ({...p, full_name: e.target.value}))} 
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Tema Rengi</Label>
                            <div className="flex flex-wrap gap-2">
                                {["#4a4036", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed"].map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`h-8 w-8 rounded-full border-2 transition-all ${formData.color === color ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setFormData(p => ({...p, color}))}
                                    />
                                ))}
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Değişiklikleri Kaydet
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>

        {/* SAĞ KOLON: Görevler & İstatistikler */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Görev Özeti */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 border-indigo-100 dark:border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-indigo-600" /> Üzerimdeki İş Yükü
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div>
                                <span className="text-3xl font-bold text-foreground">{pendingTasks}</span>
                                <span className="text-sm text-muted-foreground ml-2">bekleyen görev</span>
                            </div>
                            <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-800 border-emerald-100 dark:border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Başarı Oranı
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between mb-2">
                            <div>
                                <span className="text-3xl font-bold text-foreground">%{completionRate}</span>
                                <span className="text-sm text-muted-foreground ml-2">tamamlandı</span>
                            </div>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                    </CardContent>
                </Card>
            </div>

            {/* Görev Listesi */}
            <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Görevlerim</CardTitle>
                            <CardDescription>Size atanan tüm projelerdeki aktif işler</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>
                            Projeleri Gör <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        {myTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted-foreground">
                                <LayoutDashboard className="h-12 w-12 mb-4 opacity-20" />
                                <p>Üzerinize atanmış aktif bir görev bulunmuyor.</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {myTasks.map((task) => (
                                    <div 
                                        key={task.id} 
                                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => navigate(`/projects/${task.project_id}`)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                        {task.work_item_name}
                                                    </span>
                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(task.status)}`}>
                                                        {task.status.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <span className="font-medium text-foreground/80">{task.project_name}</span>
                                                    <span>•</span>
                                                    <span>{task.area_name}</span>
                                                    <span>•</span>
                                                    <span>{task.subtask_name}</span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground whitespace-nowrap flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(task.updated_at).toLocaleDateString("tr-TR")}
                                                </div>
                                                {task.notes && (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        Not Var
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

        </div>
      </div>
    </div>
  );
}