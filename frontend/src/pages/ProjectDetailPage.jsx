import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, User, Phone, Mail, Calendar, Wallet, Plus, Trash2,
  Package, Users, History, CheckCircle2, Clock, AlertCircle, CreditCard,
  Banknote, Building2, CheckSquare, StopCircle, PlayCircle, FileText,
  MessageSquare, Upload, UserPlus, AlertTriangle, File, X, Download,
  LayoutDashboard, Activity, Receipt
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const statusLabels = {
  planlandi: "Planlandı",
  uretimde: "Üretimde",
  montaj: "Montaj",
  tamamlandi: "Tamamlandı",
  durduruldu: "Durduruldu",
  bekliyor: "Bekliyor",
  kontrol: "Kontrolde",
};

const statusStyles = {
  planlandi: "bg-blue-100 text-blue-800 border-blue-200",
  uretimde: "bg-yellow-100 text-yellow-800 border-yellow-200",
  montaj: "bg-purple-100 text-purple-800 border-purple-200",
  tamamlandi: "bg-green-100 text-green-800 border-green-200",
  durduruldu: "bg-red-100 text-red-800 border-red-200",
  bekliyor: "bg-gray-100 text-gray-800 border-gray-200",
  kontrol: "bg-orange-100 text-orange-800 border-orange-200",
};

const paymentMethods = {
  nakit: { label: "Nakit", icon: Banknote },
  havale: { label: "Havale/EFT", icon: Building2 },
  kredi_karti: { label: "Kredi Kartı", icon: CreditCard },
};

const activityIcons = {
  project_created: CheckCircle2,
  project_updated: AlertCircle,
  area_created: MapPin,
  area_updated: MapPin,
  area_deleted: Trash2,
  staff_assigned: Users,
  staff_unassigned: Users,
  payment_added: Wallet,
  payment_deleted: Wallet,
  task_status_changed: Clock,
  status_change: AlertCircle,
  file_uploaded: Upload,
  note_updated: MessageSquare
};

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Data States
  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [taskFiles, setTaskFiles] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAreaId, setSelectedAreaId] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [noteText, setNoteText] = useState("");

  // Dialog States
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState(null);

  // Forms (EKSİK OLANLAR EKLENDİ)
  const [paymentForm, setPaymentForm] = useState({
    area_id: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "nakit",
    notes: "",
  });

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchActivities();
      fetchPayments();
      fetchTasks();
      fetchUsers();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchTasks();
  }, [selectedAreaId]);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      if (error.response && error.response.status === 403) {
        toast.error("Bu projeyi görüntüleme yetkiniz yok.");
        navigate("/projects");
      } else {
        toast.error("Proje yüklenemedi");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await axios.get(`${API_URL}/projects/${projectId}/activities`);
      setActivities(res.data);
    } catch (e) { console.error("Aktiviteler çekilemedi"); }
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API_URL}/projects/${projectId}/payments`);
      setPayments(res.data);
    } catch (e) { console.error("Ödemeler çekilemedi"); }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.warn("Kullanıcı listesi yetki nedeniyle alınamadı:", error);
    }
  };
  
  const fetchTasks = async () => {
    try {
      const params = selectedAreaId !== "all" ? { area_id: selectedAreaId } : {};
      const res = await axios.get(`${API_URL}/projects/${projectId}/tasks`, { params });
      setTasks(res.data);
    } catch (e) { console.error("Görevler çekilemedi"); }
  };

  const fetchTaskFiles = async (taskId) => {
    try {
      const res = await axios.get(`${API_URL}/files`, { params: { task_id: taskId } });
      setTaskFiles(res.data);
    } catch (error) { console.error("Dosyalar çekilemedi", error); }
  };

  // --- ACTIONS ---

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Proje durumunu değiştirmek istediğinize emin misiniz?`)) return;
    try {
      await axios.put(`${API_URL}/projects/${projectId}`, { status: newStatus });
      toast.success("Proje durumu güncellendi");
      fetchProject(); fetchActivities();
    } catch (error) { toast.error("Hata oluştu"); }
  };

  const handleAddTeamMember = async (userId) => {
    try {
      await axios.post(`${API_URL}/projects/${projectId}/assignments`, {
        user_id: userId, assignment_type: "project"
      });
      toast.success("Personel eklendi");
      fetchProject(); fetchActivities();
    } catch (error) { toast.error("Hata oluştu veya personel zaten ekli"); }
  };

  const handleRemoveTeamMember = async (assignmentId) => {
    if(!confirm("Personeli projeden çıkarmak istiyor musunuz?")) return;
    try {
      await axios.delete(`${API_URL}/projects/${projectId}/assignments/${assignmentId}`);
      toast.success("Personel çıkarıldı");
      fetchProject(); fetchActivities();
    } catch (error) { toast.error("Hata oluştu"); }
  };

  // --- DRAWER ACTIONS (Task) ---

  const openTaskDrawer = (task) => {
    setSelectedTask(task);
    setNoteText(task.notes || "");
    fetchTaskFiles(task.id);
    setDrawerOpen(true);
  };

  const handleSaveNote = async () => {
    if (!selectedTask) return;
    try {
      await axios.put(`${API_URL}/projects/${projectId}/tasks/${selectedTask.id}`, { notes: noteText });
      toast.success("Not kaydedildi");
      const updatedTasks = tasks.map(t => t.id === selectedTask.id ? { ...t, notes: noteText } : t);
      setTasks(updatedTasks);
      setSelectedTask({ ...selectedTask, notes: noteText });
    } catch (error) { toast.error("Not kaydedilemedi"); }
  };

  const handleTaskStatusChange = async (val) => {
    try {
        await axios.put(`${API_URL}/projects/${projectId}/tasks/${selectedTask.id}`, { status: val });
        toast.success("Aşama durumu güncellendi");
        fetchTasks(); fetchProject(); fetchActivities();
        setSelectedTask({...selectedTask, status: val});
    } catch(e) { toast.error("Hata oluştu"); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
        await axios.post(`${API_URL}/files/upload`, formData, {
            params: { project_id: projectId, task_id: selectedTask.id }
        });
        toast.success("Dosya yüklendi");
        fetchTaskFiles(selectedTask.id);
        fetchActivities();
    } catch (error) { toast.error("Dosya yüklenirken hata oluştu"); }
  };

  const handleTaskAssign = async (userId) => {
    const val = userId === "unassigned" ? null : userId;
    try {
        await axios.put(`${API_URL}/projects/${projectId}/tasks/${selectedTask.id}`, { assigned_to: val });
        const uName = users.find(u => u.id === val)?.full_name;
        toast.success(val ? `${uName} atandı` : "Atama kaldırıldı");
        fetchTasks();
        setSelectedTask({...selectedTask, assigned_to: val, assigned_to_name: uName});
    } catch(e) { toast.error("Atama başarısız"); }
  };

  // --- DIALOG ACTIONS ---

  const handleAddPayment = async () => {
    if (!paymentForm.area_id || !paymentForm.amount) {
      toast.error("Alan ve tutar gereklidir");
      return;
    }
    try {
      await axios.post(`${API_URL}/projects/${projectId}/payments`, {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
      });
      toast.success("Tahsilat kaydedildi");
      setPaymentDialog(false);
      setPaymentForm({
        area_id: "",
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "nakit",
        notes: "",
      });
      fetchProject();
      fetchPayments();
      fetchActivities();
    } catch (error) {
      toast.error("Tahsilat kaydedilirken hata oluştu");
    }
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;
    try {
      await axios.delete(`${API_URL}/projects/${projectId}/payments/${deletePaymentId}`);
      toast.success("Tahsilat silindi");
      setDeletePaymentId(null);
      fetchProject();
      fetchPayments();
      fetchActivities();
    } catch (error) {
      toast.error("Tahsilat silinirken hata oluştu");
    }
  };

  // --- HIERARCHY ---
  const organizeTasks = () => {
    const groups = {};
    tasks.forEach(task => {
        const gn = task.group_name || "Genel";
        const sn = task.subtask_name || "İşlem";
        if (!groups[gn]) groups[gn] = {};
        if (!groups[gn][sn]) groups[gn][sn] = [];
        groups[gn][sn].push(task);
    });
    return groups;
  };

  if (loading || !project) return <div className="p-10 text-center"><Skeleton className="h-10 w-1/3 mx-auto mb-4"/><p>Yükleniyor...</p></div>;

  const isProjectActive = !["tamamlandi", "durduruldu"].includes(project.status);
  const canEdit = user.is_admin || hasPermission("projects.edit"); // Yetki kontrolü (sadece aktifse düzenlenir kontrolü aşağıda)
  const taskHierarchy = organizeTasks();

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.4))] overflow-hidden bg-background">
      
      {/* === HEADER (PROJE KÜNYESİ) === */}
      <div className="bg-slate-950 text-slate-50 p-6 shadow-lg shrink-0 border-b border-slate-800">
        <div className="flex flex-col lg:flex-row justify-between gap-6">
            
            {/* SOL: Proje Başlık & Info */}
            <div className="flex gap-4">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => navigate("/projects")}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                        <Badge className={cn("text-xs font-bold px-2 py-0.5 border-none", 
                            project.status === 'tamamlandi' ? "bg-green-600 text-white" : 
                            project.status === 'durduruldu' ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                        )}>
                            {statusLabels[project.status]}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5"><User className="h-4 w-4"/> {project.customer_name}</div>
                        <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/> {new Date(project.created_at).toLocaleDateString("tr-TR")}</div>
                        <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4"/> {project.areas.length} Alan</div>
                    </div>
                </div>
            </div>

            {/* SAĞ: Aksiyonlar Kokpiti */}
            <div className="flex flex-wrap items-center gap-3">
                
                {/* 1. Alan Filtresi */}
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Çalışma Alanı</span>
                    <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                        <SelectTrigger className="w-[180px] h-9 bg-slate-900 border-slate-700 text-slate-200 focus:ring-slate-600">
                            <SelectValue placeholder="Tüm Alanlar" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                            <SelectItem value="all">Tüm Alanlar</SelectItem>
                            {project.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {/* 2. Yetkili Ekleme */}
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ekip Yönetimi</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 h-9" disabled={!user.is_admin || !isProjectActive}>
                                <UserPlus className="h-4 w-4 mr-2" /> Personel Ekle
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700 text-slate-200">
                            <DropdownMenuLabel>Personel Seç</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-700"/>
                            {users.length > 0 ? (
                                users.filter(u => !project.assignments.find(a => a.user_id === u.id)).map(u => (
                                    <DropdownMenuItem key={u.id} onClick={() => handleAddTeamMember(u.id)} className="focus:bg-slate-800 focus:text-white">
                                        {u.full_name}
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <div className="p-2 text-xs text-muted-foreground text-center">Liste yüklenemedi</div>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="w-px h-10 bg-slate-800 mx-2 hidden lg:block"></div>

                {/* 3. Durdur / Tamamla Butonları */}
                <div className="flex items-center gap-2 mt-5 lg:mt-0">
                    {project.status !== 'tamamlandi' && project.status !== 'durduruldu' && (
                        <>
                            {user.is_admin && (
                                <Button onClick={() => handleStatusChange('durduruldu')} variant="destructive" size="sm" className="h-9 shadow-sm">
                                    <StopCircle className="h-4 w-4 mr-2" /> Durdur
                                </Button>
                            )}
                            <Button onClick={() => handleStatusChange('tamamlandi')} className="bg-green-600 hover:bg-green-700 text-white h-9 shadow-sm" size="sm">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Tamamla
                            </Button>
                        </>
                    )}
                    {project.status === 'durduruldu' && user.is_admin && (
                        <Button onClick={() => handleStatusChange('planlandi')} variant="outline" className="text-white border-white/20 hover:bg-slate-800 h-9" size="sm">
                            <PlayCircle className="h-4 w-4 mr-2" /> Yeniden Başlat
                        </Button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* === TABS & CONTENT === */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
        <div className="bg-white border-b px-6 shadow-sm z-10">
            <TabsList className="h-14 bg-transparent p-0 gap-8">
                <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-0 h-full font-medium text-slate-500">
                    <LayoutDashboard className="h-4 w-4 mr-2"/> Genel Bakış
                </TabsTrigger>
                <TabsTrigger value="process" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-0 h-full font-medium text-slate-500">
                    <CheckSquare className="h-4 w-4 mr-2"/> Süreç Yönetimi
                </TabsTrigger>
                <TabsTrigger value="finance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-0 h-full font-medium text-slate-500">
                    <Receipt className="h-4 w-4 mr-2"/> Finans
                </TabsTrigger>
                <TabsTrigger value="activities" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-0 h-full font-medium text-slate-500">
                    <Activity className="h-4 w-4 mr-2"/> Aktivite Geçmişi
                </TabsTrigger>
            </TabsList>
        </div>

        {/* 1. GENEL BAKIŞ */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 space-y-6 animate-in fade-in-50 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* SOL KOLON: Detaylar & Alanlar */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Proje Bilgi Kartı */}
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Proje Detayları</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <span className="text-xs uppercase text-slate-400 font-bold tracking-wider">Müşteri İletişim</span>
                                <div className="font-medium flex items-center gap-2 text-slate-700">
                                    <Phone className="h-4 w-4 text-slate-400"/> {project.customer_phone || "-"}
                                </div>
                                <div className="font-medium flex items-center gap-2 text-slate-700">
                                    <Mail className="h-4 w-4 text-slate-400"/> {project.customer_email || "-"}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-xs uppercase text-slate-400 font-bold tracking-wider">Termin & Durum</span>
                                <div className="font-medium flex items-center gap-2 text-slate-700">
                                    <Calendar className="h-4 w-4 text-slate-400"/> {project.due_date ? new Date(project.due_date).toLocaleDateString() : "-"}
                                </div>
                                <div className="text-sm text-slate-600 mt-1">
                                    Oluşturan: <span className="font-semibold">{project.created_by_name}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <span className="text-xs uppercase text-slate-400 font-bold tracking-wider">Açıklama</span>
                                <div className="text-sm bg-slate-50 border border-slate-100 p-4 rounded-md text-slate-600 leading-relaxed">
                                    {project.description || "Açıklama girilmemiş."}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Çalışma Alanları */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800"><MapPin className="h-5 w-5 text-primary"/> Çalışma Alanları</h3>
                        {project.areas.length === 0 ? (
                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">Henüz alan eklenmemiş.</div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-4">
                                {project.areas.map(area => (
                                    <Card key={area.id} className="hover:shadow-md transition-shadow cursor-default border-slate-200">
                                        <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-base font-semibold text-slate-800">{area.name}</CardTitle>
                                                <Badge variant="outline" className="bg-white">{statusLabels[area.status]}</Badge>
                                            </div>
                                            <CardDescription>{area.work_items.length} İş Kalemi</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-slate-500 font-medium">İlerleme</span>
                                                <span className="font-bold text-slate-700">%{Math.round(area.progress || 0)}</span>
                                            </div>
                                            <Progress value={area.progress || 0} className="h-2 bg-slate-100" indicatorClassName={area.progress === 100 ? 'bg-green-500' : ''} />
                                            
                                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium">
                                                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                                    <span className="block text-slate-400 mb-0.5">Anlaşma</span>
                                                    {formatCurrency(area.agreed_price)}
                                                </div>
                                                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                                    <span className="block text-slate-400 mb-0.5">Kalan</span>
                                                    <span className={area.remaining_amount > 0 ? "text-orange-600" : "text-green-600"}>
                                                        {formatCurrency(area.remaining_amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* SAĞ KOLON: Ekip & Finans */}
                <div className="space-y-6">
                    {/* Finans Özeti */}
                    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/30">
                            <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary"/> Finansal Özet</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex flex-col divide-y divide-slate-100">
                                <div className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                                    <span className="text-sm text-slate-500">Toplam Tutar</span>
                                    <span className="font-bold text-lg text-slate-800">{formatCurrency(project.finance.total_agreed)}</span>
                                </div>
                                <div className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                                    <span className="text-sm text-slate-500">Tahsil Edilen</span>
                                    <span className="font-bold text-lg text-green-600">{formatCurrency(project.finance.total_collected)}</span>
                                </div>
                                <div className="p-4 flex justify-between items-center bg-red-50/30 hover:bg-red-50/50 transition-colors">
                                    <span className="text-sm text-slate-500">Kalan Bakiye</span>
                                    <span className="font-bold text-lg text-red-600">{formatCurrency(project.finance.total_remaining)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ekip Listesi */}
                    <Card className="border-slate-200 shadow-sm h-fit">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary"/> Proje Ekibi</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-3">
                                {project.assignments.length === 0 ? (
                                    <div className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg border border-dashed">Ekip atanmadı.</div>
                                ) : (
                                    project.assignments.map(assign => (
                                        <div key={assign.id} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-md transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                                                    {assign.user_name.substring(0,2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-700">{assign.user_name}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase">{assign.assignment_type === 'project' ? 'Yönetici' : 'Alan Sorumlusu'}</span>
                                                </div>
                                            </div>
                                            {user.is_admin && isProjectActive && (
                                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all" onClick={() => handleRemoveTeamMember(assign.id)}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>

        {/* 2. SÜREÇ YÖNETİMİ */}
        <TabsContent value="process" className="flex-1 overflow-hidden flex flex-col p-6 pt-2 animate-in fade-in-50 duration-300">
            <ScrollArea className="h-full pr-4">
                {Object.keys(taskHierarchy).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50/50">
                        <Package className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">İşlem Yok</p>
                        <p className="text-sm">Seçili çalışma alanında kayıtlı iş kalemi bulunmuyor.</p>
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="space-y-4 pb-10">
                        {Object.entries(taskHierarchy).map(([groupName, subtasksMap], index) => (
                            <AccordionItem key={index} value={`g-${index}`} className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
                                <AccordionTrigger className="hover:no-underline py-4 px-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <span className="font-bold text-lg text-slate-800">{groupName}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-6 px-4 bg-slate-50/30">
                                    <div className="pl-6 ml-5 border-l-2 border-slate-200 space-y-8 mt-2">
                                        {Object.entries(subtasksMap).map(([subtaskName, tasks], sIdx) => (
                                            <div key={sIdx}>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-slate-400 ring-4 ring-white" />
                                                    {subtaskName}
                                                </h4>
                                                <div className="grid gap-3">
                                                    {tasks.map(task => (
                                                        <div 
                                                            key={task.id} 
                                                            onClick={() => openTaskDrawer(task)}
                                                            className={cn(
                                                                "group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-200 relative overflow-hidden",
                                                                task.status === 'tamamlandi' ? "bg-green-50/30 border-green-200" : ""
                                                            )}
                                                        >
                                                            {task.status === 'tamamlandi' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"/>}
                                                            
                                                            <div className="flex items-center gap-4">
                                                                {task.status === 'tamamlandi' ? (
                                                                    <div className="h-9 w-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 border border-green-200 shadow-sm"><CheckCircle2 className="h-5 w-5" /></div>
                                                                ) : (
                                                                    <div className="h-9 w-9 rounded-full bg-white text-slate-400 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm group-hover:border-primary/30 group-hover:text-primary transition-colors"><Clock className="h-5 w-5" /></div>
                                                                )}
                                                                <div>
                                                                    <div className="font-semibold text-slate-800 text-base">{task.work_item_name}</div>
                                                                    {task.assigned_to_name ? (
                                                                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 bg-slate-100 w-fit px-2 py-0.5 rounded-full">
                                                                            <User className="h-3 w-3" /> {task.assigned_to_name}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-slate-400 mt-1 italic">Atama yok</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className={cn("px-3 py-1 text-xs font-medium border", statusStyles[task.status])}>
                                                                {statusLabels[task.status]}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </ScrollArea>
        </TabsContent>

        {/* 3. FİNANS TABI */}
        <TabsContent value="finance" className="flex-1 overflow-y-auto p-6 animate-in fade-in-50 duration-300">
            <Card className="h-full flex flex-col shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 bg-slate-50/30 py-4">
                    <CardTitle className="text-lg flex items-center gap-2"><Receipt className="h-5 w-5 text-primary"/> Tahsilat Hareketleri</CardTitle>
                    {isProjectActive && canEdit && <Button onClick={() => setPaymentDialog(true)} size="sm" className="bg-primary text-primary-foreground shadow-sm"><Plus className="h-4 w-4 mr-2"/> Tahsilat Ekle</Button>}
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full">
                        {payments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <Wallet className="h-10 w-10 mb-3 opacity-20"/>
                                <p>Henüz kayıtlı tahsilat yok.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {payments.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center border border-green-100 shadow-sm">
                                                {paymentMethods[p.payment_method]?.icon ? 
                                                    <p.payment_method.icon className="h-5 w-5"/> : 
                                                    <Wallet className="h-5 w-5"/>
                                                }
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg text-slate-800">{formatCurrency(p.amount)}</div>
                                                <div className="text-sm text-slate-500 flex items-center gap-2">
                                                    <span className="font-medium text-slate-700">{p.area_name}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"/>
                                                    <span>{new Date(p.payment_date).toLocaleDateString()}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"/>
                                                    <span className="capitalize">{paymentMethods[p.payment_method]?.label || p.payment_method}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {isProjectActive && canEdit && (
                                            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 hover:bg-red-50" onClick={() => {setDeletePaymentId(p.id)}}><Trash2 className="h-4 w-4"/></Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>

        {/* 4. AKTİVİTELER */}
        <TabsContent value="activities" className="flex-1 overflow-y-auto p-6 animate-in fade-in-50 duration-300">
            <Card className="h-full border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-50 bg-slate-50/30 py-4">
                    <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5 text-primary"/> Proje Tarihçesi</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-full p-6">
                        <div className="space-y-8 ml-2">
                            {activities.map((act, i) => {
                                const Icon = activityIcons[act.action] || Clock;
                                return (
                                    <div key={act.id} className="flex gap-4 relative">
                                        {i !== activities.length - 1 && <div className="absolute left-[15px] top-8 bottom-[-32px] w-0.5 bg-slate-100"></div>}
                                        <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 z-10 shadow-sm text-slate-500">
                                            <Icon className="h-4 w-4"/>
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <div className="text-sm text-slate-800 font-medium">{act.description}</div>
                                            <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{act.user_name}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"/>
                                                <span>{new Date(act.created_at).toLocaleString("tr-TR")}</span>
                                                {act.area_name && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300"/>
                                                        <span className="text-primary">{act.area_name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>

      {/* === DRAWER (GÖREV DETAY & İŞLEMLER) === */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto p-0 border-l border-slate-200 shadow-2xl">
            {selectedTask && (
                <div className="flex flex-col h-full bg-white">
                    <div className="p-6 bg-slate-50 border-b border-slate-200">
                        <SheetHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="font-normal bg-white border-slate-200 text-slate-500">{selectedTask.group_name}</Badge>
                                <span className="text-slate-300">/</span>
                                <span className="text-sm font-medium text-slate-600">{selectedTask.subtask_name}</span>
                            </div>
                            <SheetTitle className="text-xl font-bold text-slate-900">{selectedTask.work_item_name}</SheetTitle>
                            <SheetDescription>İşlem detaylarını yönetin.</SheetDescription>
                        </SheetHeader>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        
                        {/* 1. DURUM */}
                        <div className="space-y-3">
                            <Label className="text-xs uppercase text-slate-400 font-bold tracking-wider flex items-center gap-2"><Clock className="h-3 w-3"/> Durum</Label>
                            <Select disabled={!canEdit || !isProjectActive} value={selectedTask.status} onValueChange={handleTaskStatusChange}>
                                <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:ring-primary"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(statusLabels).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", 
                                                    key === 'tamamlandi' ? "bg-green-500" : 
                                                    key === 'uretimde' ? "bg-yellow-500" : "bg-slate-300"
                                                )}/>
                                                {label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator className="bg-slate-100" />

                        {/* 2. PERSONEL ATAMA */}
                        <div className="space-y-3">
                            <Label className="text-xs uppercase text-slate-400 font-bold tracking-wider flex items-center gap-2"><User className="h-3 w-3"/> Sorumlu Personel</Label>
                            <Select disabled={!canEdit || !isProjectActive} value={selectedTask.assigned_to || "unassigned"} onValueChange={handleTaskAssign}>
                                <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:ring-primary"><SelectValue placeholder="Personel Seç" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned" className="text-slate-400">- Atama Yok -</SelectItem>
                                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator className="bg-slate-100" />

                        {/* 3. DOSYALAR */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs uppercase text-slate-400 font-bold tracking-wider flex items-center gap-2"><FileText className="h-3 w-3"/> Dosyalar</Label>
                                {canEdit && isProjectActive && (
                                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 text-xs">
                                        <Upload className="h-3 w-3 mr-2"/> Dosya Yükle
                                    </Button>
                                )}
                                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                            </div>
                            
                            {taskFiles.length === 0 ? (
                                <div className="text-sm text-slate-400 text-center border border-dashed border-slate-200 p-6 rounded-lg bg-slate-50">Dosya yüklenmemiş.</div>
                            ) : (
                                <div className="grid gap-2">
                                    {taskFiles.map(f => (
                                        <div key={f.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center shrink-0 border border-blue-100"><File className="h-4 w-4"/></div>
                                                <div className="truncate text-sm font-medium text-slate-700">{f.original_name}</div>
                                            </div>
                                            <a href={`${API_URL}/files/${f.id}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                                                <Download className="h-4 w-4"/>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Separator className="bg-slate-100" />

                        {/* 4. NOTLAR */}
                        <div className="space-y-3">
                            <Label className="text-xs uppercase text-slate-400 font-bold tracking-wider flex items-center gap-2"><MessageSquare className="h-3 w-3"/> Notlar</Label>
                            <div className="relative">
                                <Textarea 
                                    placeholder="İşlemle ilgili notlar..." 
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    className="min-h-[120px] resize-none bg-slate-50 border-slate-200 focus:bg-white transition-all pb-10"
                                    disabled={!canEdit || !isProjectActive}
                                />
                                {canEdit && isProjectActive && (
                                    <div className="absolute bottom-2 right-2">
                                        <Button size="sm" className="h-7 text-xs" onClick={handleSaveNote}>Kaydet</Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {(!isProjectActive || !canEdit) && (
                            <div className="p-4 bg-orange-50 text-orange-800 rounded-lg text-sm border border-orange-100 flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-orange-600"/>
                                <span>{!isProjectActive ? "Proje kapalı olduğu için düzenleme yapılamaz." : "Düzenleme yetkiniz yok."}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </SheetContent>
      </Sheet>

      {/* --- DIALOGS --- */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
            <DialogHeader><DialogTitle>Tahsilat Ekle</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Alan</Label>
                    <Select value={paymentForm.area_id} onValueChange={(val) => setPaymentForm({...paymentForm, area_id: val})}>
                        <SelectTrigger><SelectValue placeholder="Seçiniz"/></SelectTrigger>
                        <SelectContent>{project.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2"><Label>Tutar</Label><Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} /></div>
                <div className="space-y-2"><Label>Yöntem</Label>
                    <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm({...paymentForm, payment_method: v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>{Object.entries(paymentMethods).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter><Button onClick={handleAddPayment}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Emin misiniz?</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePayment} className="bg-destructive">Sil</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}