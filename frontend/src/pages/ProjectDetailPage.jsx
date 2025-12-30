import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/contexts/AuthContext";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  ArrowLeft,
  Users,
  Activity,
  Wallet,
  Layers,
  ChevronRight,
  FileUp,
  Paperclip,
  UserPlus,
  ClipboardList,
  CheckCircle2,
  Clock,
  Wrench,
  Factory,
  Box,
  ListChecks,
  BadgeCheck,
  LayoutDashboard,
  GitPullRequest,
  Receipt,
  Building2,
  BadgeDollarSign,
  FileText,
  MessageSquare,
  RefreshCcw,
  PlusCircle,
  Trash2,
  PenLine,
  CalendarDays,
  CreditCard,
  Download,
  Send,
  Loader2,
  X
} from "lucide-react";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// --- HELPERS & CONSTANTS ---

const projectStatusLabels = {
  planlandi: "Planlandı",
  uretimde: "Üretimde",
  montaj: "Montaj",
  kontrol: "Kontrol",
  tamamlandi: "Tamamlandı",
};

const projectStatusStyles = {
  planlandi: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  uretimde: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  montaj: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  kontrol: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  tamamlandi: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
};

const taskStatusOptions = [
  { value: "bekliyor", label: "Bekliyor", icon: Clock, color: "text-slate-500 dark:text-slate-400" },
  { value: "isleme_alindi", label: "İşleme Alındı", icon: Wrench, color: "text-blue-600 dark:text-blue-400" },
  { value: "montaj", label: "Montajda", icon: Factory, color: "text-purple-600 dark:text-purple-400" },
  { value: "uretimde", label: "Üretimde", icon: ClipboardList, color: "text-amber-600 dark:text-amber-400" },
  { value: "tamamlandi", label: "Tamamlandı", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
];

const fileTypeOptions = [
  { value: "diger", label: "Diğer" },
  { value: "cizim", label: "Çizim" },
  { value: "pdf", label: "PDF" },
];

function getInitials(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function pickStageIcon(name = "") {
  const n = String(name).toLowerCase();
  if (n.includes("kontrol")) return ListChecks;
  if (n.includes("montaj")) return Box;
  if (n.includes("üretim") || n.includes("uretim")) return Factory;
  if (n.includes("plan")) return ClipboardList;
  if (n.includes("teslim") || n.includes("tamam")) return BadgeCheck;
  return Layers;
}

function calcProgressFromTasks(taskList) {
  if (!taskList || taskList.length === 0) return 0;
  const done = taskList.filter((t) => t.status === "tamamlandi").length;
  return Math.round((done / taskList.length) * 100);
}

function activityIconByType(activity) {
  const t = String(activity?.activity_type || activity?.type || "").toLowerCase();
  const msg = String(activity?.message || "").toLowerCase();

  if (t.includes("file") || msg.includes("dosya")) return { icon: Paperclip, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300" };
  if (t.includes("upload") || msg.includes("yükl")) return { icon: FileUp, color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-300" };
  if (t.includes("payment") || msg.includes("tahsil")) return { icon: BadgeDollarSign, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300" };
  if (t.includes("assign") || msg.includes("atandı")) return { icon: UserPlus, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-300" };
  if (t.includes("status") || msg.includes("durum")) return { icon: RefreshCcw, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300" };
  if (t.includes("note") || msg.includes("yorum")) return { icon: MessageSquare, color: "text-pink-500 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-300" };
  if (t.includes("create") || msg.includes("oluştur")) return { icon: PlusCircle, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300" };
  if (t.includes("delete") || msg.includes("sil")) return { icon: Trash2, color: "text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-300" };
  if (t.includes("update") || msg.includes("güncell")) return { icon: PenLine, color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300" };
  
  return { icon: Activity, color: "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400" };
}

function safeDetailText(a) {
  const d = a?.details ?? a?.description ?? a?.note ?? a?.meta ?? a?.data ?? a?.payload ?? null;
  if (!d) return "";
  if (typeof d === "string") return d.trim();
  try { return JSON.stringify(d); } catch { return String(d); }
}

// --- MAIN COMPONENT ---

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // State Management
  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Tab Specific States
  const [selectedProcessAreaId, setSelectedProcessAreaId] = useState(null);
  const [selectedFinanceAreaId, setSelectedFinanceAreaId] = useState("all");

  // Modals & Drawers
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [teamDialog, setTeamDialog] = useState(false);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  
  // Deletion States
  const [deletePaymentId, setDeletePaymentId] = useState(null);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState(null);

  // Comments State
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const commentsEndRef = useRef(null);

  // Forms
  const [paymentForm, setPaymentForm] = useState({
    area_id: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "nakit",
    notes: "",
  });

  const [assignForm, setAssignForm] = useState({
    user_id: "",
    assignment_type: "project",
    area_id: "",
  });

  const [activeTask, setActiveTask] = useState(null);
  const [taskEdit, setTaskEdit] = useState({
    status: "bekliyor",
    assigned_to: "unassigned",
    notes: "",
    file_type: "diger",
    file: null,
    uploading: false,
    saving: false,
  });

  // Fetch Logic
  useEffect(() => {
    if (projectId) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Drawer açıldığında yorumları çek
  useEffect(() => {
    if (activeTask && taskDrawerOpen) {
      fetchComments(activeTask.id);
    }
  }, [activeTask, taskDrawerOpen]);

  // Yorumlar yüklendiğinde en alta kaydır
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchProject(),
        fetchActivities(),
        fetchPayments(),
        fetchTasks(),
        fetchUsers(),
        fetchFiles(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProject = async () => {
    try {
      const r = await axios.get(`${API_URL}/projects/${projectId}`);
      setProject(r.data);
      const firstAreaId = r.data?.areas?.[0]?.id || null;
      setSelectedProcessAreaId((prev) => prev || firstAreaId);
      setPaymentForm((p) => ({ ...p, area_id: p.area_id || firstAreaId || "" }));
      setAssignForm((a) => ({ ...a, area_id: a.area_id || firstAreaId || "" }));
    } catch { toast.error("Proje yüklenirken hata oluştu"); }
  };

  const fetchActivities = async () => { try { const r = await axios.get(`${API_URL}/projects/${projectId}/activities`); setActivities(r.data || []); } catch { setActivities([]); } };
  const fetchPayments = async () => { try { const r = await axios.get(`${API_URL}/projects/${projectId}/payments`); setPayments(r.data || []); } catch { setPayments([]); } };
  const fetchTasks = async () => { try { const r = await axios.get(`${API_URL}/projects/${projectId}/tasks`); setTasks(r.data || []); } catch { setTasks([]); } };
  const fetchUsers = async () => { try { const r = await axios.get(`${API_URL}/users`); setUsers(r.data || []); } catch { setUsers([]); } };
  const fetchFiles = async () => { try { const r = await axios.get(`${API_URL}/files`, { params: { project_id: projectId } }); setFiles(r.data || []); } catch { setFiles([]); } };

  // Helper to get Avatar URL for any user ID
  const getUserAvatarUrl = (userId) => {
    const u = users.find(x => x.id === userId);
    if (!u || !u.avatar_url) return null;
    return u.avatar_url.startsWith("http") ? u.avatar_url : BACKEND_URL + u.avatar_url;
  };

  const getAssigneeName = (userId) => {
    const u = users.find(x => x.id === userId);
    return u?.full_name || "Bilinmiyor";
  };

  // Computed Values
  const assignedAvatars = useMemo(() => {
    const list = project?.assignments || [];
    const byKey = new Map();
    list.forEach((a) => {
      const key = a.user_id || a.user_name || a.user_email || a.id;
      if (!byKey.has(key)) byKey.set(key, a);
    });
    return Array.from(byKey.values());
  }, [project]);

  // Process Tab Computation
  const selectedProcessArea = useMemo(() => (project?.areas || []).find((a) => a.id === selectedProcessAreaId) || null, [project, selectedProcessAreaId]);
  
  const processAreaTasks = useMemo(() => {
    if (!selectedProcessAreaId) return [];
    return (tasks || []).filter((t) => t.area_id === selectedProcessAreaId);
  }, [tasks, selectedProcessAreaId]);

  const processTree = useMemo(() => {
    const tree = new Map();
    for (const t of processAreaTasks) {
      const group = t.group_name || "Diğer";
      const sub = t.subtask_name || "Alt Görev";
      const wi = t.work_item_name || "İş Kalemi";
      if (!tree.has(group)) tree.set(group, new Map());
      const subMap = tree.get(group);
      if (!subMap.has(sub)) subMap.set(sub, new Map());
      const wiMap = subMap.get(sub);
      if (!wiMap.has(wi)) wiMap.set(wi, []);
      wiMap.get(wi).push(t);
    }
    return Array.from(tree.entries()).map(([groupName, subMap]) => {
      const subs = Array.from(subMap.entries()).map(([subName, wiMap]) => {
        const workItems = Array.from(wiMap.entries()).map(([wiName, list]) => ({
          workItemName: wiName,
          tasks: list,
          progress: calcProgressFromTasks(list),
        }));
        return { subName, workItems };
      });
      return { groupName, subs };
    });
  }, [processAreaTasks]);

  // Finance Tab Computation (With Filter)
  const financeStats = useMemo(() => {
    const isAll = selectedFinanceAreaId === "all";
    const targetAreas = isAll ? project?.areas || [] : (project?.areas || []).filter(a => a.id === selectedFinanceAreaId);
    const targetPayments = isAll ? payments || [] : (payments || []).filter(p => p.area_id === selectedFinanceAreaId);
    const totalAgreed = targetAreas.reduce((acc, a) => acc + Number(a.agreed_price || 0), 0);
    const totalCollected = targetPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const totalRemaining = totalAgreed - totalCollected;
    return { totalAgreed, totalCollected, totalRemaining, targetPayments };
  }, [project, payments, selectedFinanceAreaId]);

  // Overview Tab Totals (Global)
  const globalTotals = useMemo(() => {
    const areas = project?.areas || [];
    const totalAgreed = areas.reduce((acc, a) => acc + Number(a.agreed_price || 0), 0);
    const totalCollected = (payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return { totalAgreed, totalCollected };
  }, [project, payments]);

  const taskFiles = useMemo(() => {
    if (!activeTask) return [];
    return (files || []).filter((f) => f.task_id === activeTask.id);
  }, [files, activeTask]);

  // Handlers
  const openTaskDrawer = (task) => {
    if (!task) return;
    setActiveTask(task);
    setTaskEdit({
      status: task?.status || "bekliyor",
      assigned_to: task?.assigned_to || "unassigned",
      notes: task?.notes || "",
      file_type: "diger",
      file: null,
      uploading: false,
      saving: false,
    });
    setComments([]); // Clear previous comments
    setTaskDrawerOpen(true);
  };

  const handleAddPayment = async () => {
    if (!paymentForm.area_id || !paymentForm.amount) { toast.error("Alan ve tutar gereklidir"); return; }
    try {
      await axios.post(`${API_URL}/projects/${projectId}/payments`, { ...paymentForm, amount: parseFloat(paymentForm.amount) });
      toast.success("Tahsilat kaydedildi");
      setPaymentDialog(false);
      setPaymentForm((p) => ({ ...p, amount: "", notes: "", payment_date: new Date().toISOString().split("T")[0], payment_method: "nakit" }));
      await Promise.all([fetchProject(), fetchPayments(), fetchActivities()]);
    } catch { toast.error("Hata oluştu"); }
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;
    try {
      await axios.delete(`${API_URL}/projects/${projectId}/payments/${deletePaymentId}`);
      toast.success("Tahsilat silindi");
      setDeletePaymentId(null);
      await Promise.all([fetchProject(), fetchPayments(), fetchActivities()]);
    } catch { toast.error("Hata oluştu"); }
  };

  const handleAddAssignment = async () => {
    if (!assignForm.user_id) { toast.error("Personel seçmelisiniz"); return; }
    if (assignForm.assignment_type === "area" && !assignForm.area_id) { toast.error("Alan seçmelisiniz"); return; }
    try {
      await axios.post(`${API_URL}/projects/${projectId}/assignments`, {
        user_id: assignForm.user_id,
        assignment_type: assignForm.assignment_type,
        area_id: assignForm.assignment_type === "area" ? assignForm.area_id : null,
      });
      toast.success("Personel atandı");
      setAssignForm((a) => ({ ...a, user_id: "" }));
      await Promise.all([fetchProject(), fetchActivities()]);
    } catch (e) { toast.error(e.response?.data?.detail || "Hata oluştu"); }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentId) return;
    try {
      await axios.delete(`${API_URL}/projects/${projectId}/assignments/${deleteAssignmentId}`);
      toast.success("Atama kaldırıldı");
      setDeleteAssignmentId(null);
      await Promise.all([fetchProject(), fetchActivities()]);
    } catch { toast.error("Hata oluştu"); }
  };

  const saveTaskChanges = async () => {
    if (!activeTask) return;
    setTaskEdit((s) => ({ ...s, saving: true }));
    try {
      await axios.put(`${API_URL}/projects/${projectId}/tasks/${activeTask.id}`, {
        status: taskEdit.status,
        notes: taskEdit.notes,
        assigned_to: taskEdit.assigned_to === "unassigned" ? null : taskEdit.assigned_to,
      });
      toast.success("İş kalemi güncellendi");
      
      // Update local state to reflect changes immediately
      setActiveTask(prev => ({ 
          ...prev, 
          status: taskEdit.status, 
          notes: taskEdit.notes,
          assigned_to: taskEdit.assigned_to === "unassigned" ? null : taskEdit.assigned_to,
          assigned_to_name: taskEdit.assigned_to === "unassigned" ? null : getAssigneeName(taskEdit.assigned_to)
      }));

      await Promise.all([fetchTasks(), fetchActivities(), fetchProject()]);
    } catch { toast.error("Hata oluştu"); } finally { setTaskEdit((s) => ({ ...s, saving: false })); }
  };

  const uploadTaskFile = async () => {
    if (!activeTask || !taskEdit.file) { toast.error("Dosya seçmelisiniz"); return; }
    setTaskEdit((s) => ({ ...s, uploading: true }));
    try {
      const fd = new FormData();
      fd.append("project_id", projectId);
      fd.append("task_id", activeTask.id);
      fd.append("file_type", taskEdit.file_type);
      fd.append("file", taskEdit.file);
      await axios.post(`${API_URL}/files/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Dosya yüklendi");
      setTaskEdit((s) => ({ ...s, file: null }));
      await Promise.all([fetchFiles(), fetchActivities()]);
    } catch { toast.error("Hata oluştu"); } finally { setTaskEdit((s) => ({ ...s, uploading: false })); }
  };

  // --- Comment Functions ---
  const fetchComments = async (taskId) => {
    setLoadingComments(true);
    try {
      const res = await axios.get(`${API_URL}/tasks/${taskId}/comments`);
      setComments(res.data || []);
    } catch (error) {
      console.error("Yorumlar yüklenemedi", error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !activeTask) return;

    setSendingComment(true);
    try {
      const res = await axios.post(`${API_URL}/tasks/${activeTask.id}/comments`, {
        message: newComment
      });
      
      setComments([...comments, res.data]);
      setNewComment("");
      toast.success("Yorum gönderildi");
    } catch (error) {
      toast.error("Yorum gönderilemedi");
    } finally {
      setSendingComment(false);
    }
  };

  // Exports
  const exportExcel = () => {
    const rows = (payments || []).map((p) => ({
      Alan: project?.areas?.find((a) => a.id === p.area_id)?.name || "-",
      Tutar: p.amount,
      Tarih: p.payment_date,
      Yöntem: p.payment_method,
      Not: p.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tahsilatlar");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([out], { type: "application/octet-stream" }), `tahsilatlar_${project?.name || "proje"}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text(`Proje: ${project?.name || ""}`, 14, 14);
    doc.text(`Müşteri: ${project?.customer_name || ""}`, 14, 22);
    const rows = (payments || []).map((p) => [
      project?.areas?.find((a) => a.id === p.area_id)?.name || "-",
      formatCurrency(p.amount),
      p.payment_date || "-",
      p.payment_method || "-",
      p.notes || "",
    ]);
    autoTable(doc, { startY: 30, head: [["Alan", "Tutar", "Tarih", "Yöntem", "Not"]], body: rows });
    doc.save(`proje_${project?.name || "detay"}.pdf`);
  };

  // --- RENDER ---

  if (loading) {
    return (
      <div className="p-6 space-y-8 bg-slate-50/50 dark:bg-slate-950 min-h-screen">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-4">
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full">
            <Layers className="h-12 w-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Proje bulunamadı</h2>
        <Button asChild size="lg" className="mt-4">
          <Link to="/projects">Projelere Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 pb-20 transition-colors duration-300">
      
      {/* --- HERO HEADER SECTION --- */}
      <div className="relative overflow-hidden bg-slate-900 dark:bg-slate-950 text-white pb-24 pt-10 px-6 sm:px-10 shadow-xl border-b border-slate-800">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl opacity-40 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                
                <div className="space-y-4">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-300 hover:text-white hover:bg-white/10 -ml-2 pl-2"
                        onClick={() => navigate("/projects")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Tüm Projeler
                    </Button>
                    
                    <div>
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                             <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">{project.name}</h1>
                             <Badge variant="outline" className={cn("backdrop-blur-md px-3 py-1 border-0", projectStatusStyles[project.status])}>
                                {projectStatusLabels[project.status] || project.status}
                             </Badge>
                        </div>
                        <p className="text-lg text-slate-300 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-400" />
                            {project.customer_id ? (
                              <Link 
                                to={`/customers/${project.customer_id}`}
                                className="hover:text-white hover:underline transition-colors"
                              >
                                {project.customer_name}
                              </Link>
                            ) : (
                              project.customer_name
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-slate-400 pt-2">
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-slate-400" />
                            {project.areas?.length || 0} Alan
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {project.created_at ? new Date(project.created_at).toLocaleDateString("tr-TR") : "-"}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                      {/* Avatar Group & Team Trigger */}
                      <div className="flex items-center gap-2 mr-2">
                          <div className="flex -space-x-3 items-center">
                            {assignedAvatars.slice(0, 4).map((a) => (
                                <Avatar key={a.id} className="h-10 w-10 border-2 border-slate-900 cursor-pointer shadow-sm hover:scale-105 transition-transform" title={a.user_name}>
                                    <AvatarImage src={getUserAvatarUrl(a.user_id)} className="object-cover" />
                                    <AvatarFallback className="bg-white text-slate-800 text-xs font-bold">
                                        {getInitials(a.user_name)}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                            {assignedAvatars.length > 4 && (
                                <div className="h-10 w-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-white shadow-sm z-10">
                                    +{assignedAvatars.length - 4}
                                </div>
                            )}
                          </div>
                          <button 
                             onClick={() => setTeamDialog(true)}
                             className="h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-colors shadow-lg border-2 border-slate-900 z-10"
                             title="Ekibi Yönet / Yeni Ekle"
                          >
                             <Users className="h-5 w-5" />
                          </button>
                      </div>
                      
                      <div className="flex gap-2">
                          <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100 border-0" onClick={exportExcel}>
                             <Wallet className="mr-2 h-4 w-4 text-emerald-600" /> Excel
                          </Button>
                          <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0 backdrop-blur-sm" onClick={exportPDF}>
                             <FileText className="h-4 w-4" />
                          </Button>
                      </div>
                </div>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <Card className="shadow-lg border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
            <div className="p-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full justify-start h-12 bg-transparent p-0 border-b border-slate-100 dark:border-slate-800 rounded-none">
                        <TabsTrigger value="overview" className="h-full px-6 text-slate-600 dark:text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:border-b-2 data-[state=active]:border-slate-900 dark:data-[state=active]:border-slate-100 data-[state=active]:shadow-none rounded-none bg-transparent">
                            <LayoutDashboard className="h-4 w-4 mr-2" /> Genel Bakış
                        </TabsTrigger>
                        <TabsTrigger value="process" className="h-full px-6 text-slate-600 dark:text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:border-b-2 data-[state=active]:border-slate-900 dark:data-[state=active]:border-slate-100 data-[state=active]:shadow-none rounded-none bg-transparent">
                            <GitPullRequest className="h-4 w-4 mr-2" /> Süreç Takibi
                        </TabsTrigger>
                        <TabsTrigger value="finance" className="h-full px-6 text-slate-600 dark:text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:border-b-2 data-[state=active]:border-slate-900 dark:data-[state=active]:border-slate-100 data-[state=active]:shadow-none rounded-none bg-transparent">
                            <Receipt className="h-4 w-4 mr-2" /> Finansal Durum
                        </TabsTrigger>
                    </TabsList>
                    
                    <div className="p-6">
                        {/* --- OVERVIEW TAB --- */}
                        <TabsContent value="overview" className="space-y-8 mt-0">
                            
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/30 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-indigo-500" /> Toplam Anlaşma
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(globalTotals.totalAgreed)}</div>
                                        <p className="text-xs text-slate-400 mt-1">Tüm alanlar dahil</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/30 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <Wallet className="h-4 w-4 text-emerald-500" /> Toplam Tahsilat
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(globalTotals.totalCollected)}</div>
                                        <Progress value={(globalTotals.totalCollected / globalTotals.totalAgreed) * 100 || 0} className="h-2 mt-2 bg-emerald-100 dark:bg-emerald-900/50" indicatorClassName="bg-emerald-500" />
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/30 dark:to-slate-900 border-amber-100 dark:border-amber-900/50 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <CreditCard className="h-4 w-4 text-amber-500" /> Kalan Bakiye
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(globalTotals.totalAgreed - globalTotals.totalCollected)}</div>
                                        <p className="text-xs text-slate-400 mt-1">Tahsil edilmesi gereken</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Areas List */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200"><Box className="h-5 w-5 text-slate-500" /> Proje Alanları</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {(project.areas || []).map((a) => (
                                            <div 
                                                key={a.id} 
                                                onClick={() => { setSelectedProcessAreaId(a.id); setActiveTab("process"); }}
                                                className="group cursor-pointer relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-700"
                                            >
                                                <div className="absolute right-0 top-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                                                    <Box className="h-12 w-12 text-slate-900 dark:text-slate-100" />
                                                </div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-semibold text-lg text-slate-800 dark:text-slate-100">{a.name}</div>
                                                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{a.status}</Badge>
                                                </div>
                                                <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                                                    <div className="flex justify-between">
                                                        <span>Anlaşma:</span>
                                                        <span className="font-medium text-slate-700 dark:text-slate-200">{formatCurrency(a.agreed_price)}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center text-xs font-medium text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Süreci Görüntüle <ChevronRight className="h-3 w-3 ml-1" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Activity Feed */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200"><Activity className="h-5 w-5 text-slate-500" /> Son Aktiviteler</h3>
                                    <Card className="h-[500px] overflow-hidden flex flex-col border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
                                        <div className="flex-1 overflow-y-auto p-4 pr-2 custom-scrollbar">
                                            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-8 pb-4">
                                                {activities.map((a, i) => {
                                                    const { icon: AIcon, color } = activityIconByType(a);
                                                    const detail = safeDetailText(a);
                                                    const avatarUrl = getUserAvatarUrl(a.user_id);
                                                    
                                                    return (
                                                        <div key={a.id} className="relative pl-6">
                                                            {/* User Avatar on Timeline Line */}
                                                            <div className="absolute -left-4 top-0">
                                                                <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-900 shadow-sm">
                                                                    <AvatarImage src={avatarUrl} />
                                                                    <AvatarFallback className="text-[10px] bg-slate-200 text-slate-700">{getInitials(a.user_name)}</AvatarFallback>
                                                                </Avatar>
                                                                {/* Tiny Action Icon Badge */}
                                                                <div className={cn("absolute -bottom-1 -right-1 h-4 w-4 rounded-full border border-white dark:border-slate-900 flex items-center justify-center text-[8px]", color)}>
                                                                        <AIcon className="h-2 w-2" />
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-1 mt-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{a.user_name}</span>
                                                                    <span className="text-xs text-slate-400">• {new Date(a.created_at).toLocaleString("tr-TR")}</span>
                                                                </div>
                                                                <span className="text-sm text-slate-600 dark:text-slate-300">{a.message}</span>
                                                                
                                                                {detail && (
                                                                    <div className="mt-1 p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-md text-xs text-slate-500 dark:text-slate-400 shadow-sm break-all">
                                                                            {detail}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        {/* --- PROCESS TAB --- */}
                        <TabsContent value="process" className="space-y-6 mt-0">
                             <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="p-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-sm">
                                        <Layers className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                                    </div>
                                    <div className="w-full sm:w-auto">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Görüntülenen Alan</label>
                                        <Select value={selectedProcessAreaId || "none"} onValueChange={(v) => setSelectedProcessAreaId(v === "none" ? null : v)}>
                                            <SelectTrigger className="w-full sm:w-[220px] h-9 mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm text-slate-900 dark:text-slate-100">
                                                <SelectValue placeholder="Alan seçin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Alan seçilmedi</SelectItem>
                                                {(project.areas || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {selectedProcessArea && (
                                    <div className="text-right flex items-center gap-4 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{calcProgressFromTasks(processAreaTasks)}%</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">Alan İlerlemesi</div>
                                            </div>
                                            <div className="h-10 w-10">
                                                 <div className="relative h-full w-full rounded-full border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center">
                                                     <div className="absolute top-0 left-0 h-full w-full rounded-full border-4 border-indigo-500 border-t-transparent animate-spin-slow" style={{ animationDuration: '0s', transform: `rotate(${calcProgressFromTasks(processAreaTasks) * 3.6}deg)` }}></div>
                                                 </div>
                                            </div>
                                    </div>
                                )}
                             </div>

                             {!selectedProcessArea ? (
                                <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                                    <Layers className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-500 dark:text-slate-400">Süreç detaylarını görmek için yukarıdan bir alan seçin.</p>
                                </div>
                             ) : processTree.length === 0 ? (
                                <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                                    <p className="text-slate-500 dark:text-slate-400">Bu alanda tanımlı iş kalemi bulunmuyor.</p>
                                </div>
                             ) : (
                                <Accordion type="single" collapsible className="space-y-4">
                                    {processTree.map((g) => {
                                        const StageIcon = pickStageIcon(g.groupName);
                                        const allTasksInGroup = g.subs.flatMap(s => s.workItems.flatMap(w => w.tasks));
                                        const groupProgress = calcProgressFromTasks(allTasksInGroup);

                                        return (
                                            <AccordionItem key={g.groupName} value={g.groupName} className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm px-1 overflow-hidden transition-colors">
                                                <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 hover:no-underline transition-colors">
                                                    <div className="flex items-center gap-3 w-full pr-4">
                                                        <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                                            <StageIcon className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{g.groupName}</div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">{allTasksInGroup.length} Görev</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col items-end mr-2">
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">%{groupProgress}</span>
                                                                <Progress value={groupProgress} className="w-20 h-1.5 dark:bg-slate-700" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-4 pb-4 pt-0">
                                                    <div className="space-y-6 mt-4 pl-2 sm:pl-12">
                                                        {g.subs.map((s) => (
                                                            <div key={s.subName} className="space-y-3">
                                                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 text-sm uppercase tracking-wide">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                                                    {s.subName}
                                                                </h4>
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    {s.workItems.map((wi) => {
                                                                        const mainTask = wi.tasks?.[0];
                                                                        const status = mainTask?.status || "bekliyor";
                                                                        const opt = taskStatusOptions.find((x) => x.value === status);
                                                                        const StatusIcon = opt?.icon || Clock;
                                                                        
                                                                        return (
                                                                            <div 
                                                                                key={wi.workItemName} 
                                                                                onClick={() => openTaskDrawer(mainTask)} 
                                                                                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 cursor-pointer transition-all group"
                                                                            >
                                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                                    <div className={cn("p-2 rounded-full bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm shrink-0", opt?.color)}>
                                                                                        <StatusIcon className="h-4 w-4" />
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <div className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate">{wi.workItemName}</div>
                                                                                        <div className="text-xs text-slate-400 flex items-center gap-2 truncate">
                                                                                            {mainTask?.assigned_to_name ? (
                                                                                                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                                                                                                    <Avatar className="h-4 w-4">
                                                                                                        <AvatarImage src={getUserAvatarUrl(mainTask.assigned_to)} />
                                                                                                        <AvatarFallback className="text-[8px]">{getInitials(mainTask.assigned_to_name)}</AvatarFallback>
                                                                                                    </Avatar>
                                                                                                    {mainTask.assigned_to_name}
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="text-amber-500">Atanmamış</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                                                                    <Badge variant="outline" className={cn("hidden sm:inline-flex bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700", opt?.color)}>{opt?.label}</Badge>
                                                                                    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion>
                             )}
                        </TabsContent>

                        {/* --- FINANCE TAB --- */}
                        <TabsContent value="finance" className="space-y-6 mt-0">
                            {/* Finance Filter Bar */}
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-sm">
                                        <Building2 className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filtrele</label>
                                        <Select value={selectedFinanceAreaId} onValueChange={setSelectedFinanceAreaId}>
                                            <SelectTrigger className="w-[200px] h-9 mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm text-slate-900 dark:text-slate-100">
                                                <SelectValue placeholder="Tüm Proje" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Tüm Proje</SelectItem>
                                                {(project.areas || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                
                                {selectedFinanceAreaId !== "all" && (
                                    <div className="hidden sm:block">
                                        <Badge variant="secondary" className="text-sm px-3 py-1">
                                            {project.areas?.find(a => a.id === selectedFinanceAreaId)?.name} Finansalları
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Filtered Finance Summary */}
                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <CardTitle className="text-base text-slate-700 dark:text-slate-200">
                                            {selectedFinanceAreaId === "all" ? "Genel Özet" : "Alan Özeti"}
                                        </CardTitle>
                                        <Wallet className="h-4 w-4 text-slate-400" />
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 dark:border-slate-700">
                                                <span className="text-slate-500 dark:text-slate-400">Anlaşma Tutarı</span>
                                                <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{formatCurrency(financeStats.totalAgreed)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 dark:border-slate-700">
                                                <span className="text-slate-500 dark:text-slate-400">Tahsil Edilen</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(financeStats.totalCollected)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-slate-500 dark:text-slate-400">Kalan Bakiye</span>
                                                <span className="font-bold text-amber-600 dark:text-amber-500">{formatCurrency(financeStats.totalRemaining)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center bg-slate-50/30 dark:bg-slate-900/30">
                                    <CardContent className="text-center py-8">
                                        <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                                            <BadgeDollarSign className="h-6 w-6" />
                                        </div>
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Hızlı Tahsilat Ekle</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 px-8">
                                            {selectedFinanceAreaId === "all" 
                                                ? "Yeni bir ödeme kaydı girmek için butonu kullanın." 
                                                : `Seçili alan (${project.areas?.find(a => a.id === selectedFinanceAreaId)?.name}) için ödeme ekleyin.`
                                            }
                                        </p>
                                        <Button 
                                            onClick={() => {
                                                if(selectedFinanceAreaId !== "all") {
                                                    setPaymentForm(prev => ({...prev, area_id: selectedFinanceAreaId}));
                                                }
                                                setPaymentDialog(true);
                                            }} 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            <PlusCircle className="h-4 w-4 mr-2" /> Ödeme Kaydet
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-slate-800 dark:text-slate-200">Tahsilat Geçmişi</CardTitle>
                                    <CardDescription>
                                        {selectedFinanceAreaId === "all" ? "Tüm proje için yapılan ödemeler." : "Seçili alan için yapılan ödemeler."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {(financeStats.targetPayments || []).length === 0 ? (
                                        <div className="text-center py-12 text-slate-400 dark:text-slate-500">Kayıt bulunamadı.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50 dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-950 border-slate-200 dark:border-slate-800">
                                                    <TableHead className="pl-6 text-slate-500 dark:text-slate-400">Tarih</TableHead>
                                                    <TableHead className="text-slate-500 dark:text-slate-400">Alan</TableHead>
                                                    <TableHead className="text-slate-500 dark:text-slate-400">Tutar</TableHead>
                                                    <TableHead className="text-slate-500 dark:text-slate-400">Yöntem</TableHead>
                                                    <TableHead className="text-slate-500 dark:text-slate-400">Not</TableHead>
                                                    <TableHead className="text-right pr-6 text-slate-500 dark:text-slate-400">İşlem</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {financeStats.targetPayments.map((p) => (
                                                    <TableRow key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800">
                                                        <TableCell className="pl-6 font-medium text-xs text-slate-500 dark:text-slate-400">{p.payment_date}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="font-normal bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">{project?.areas?.find((a) => a.id === p.area_id)?.name || "-"}</Badge>
                                                        </TableCell>
                                                        <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</TableCell>
                                                        <TableCell className="capitalize text-slate-600 dark:text-slate-300">{p.payment_method?.replace('_', ' ')}</TableCell>
                                                        <TableCell className="max-w-[200px] truncate text-slate-400 text-xs" title={p.notes}>{p.notes || "-"}</TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeletePaymentId(p.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </Card>
      </div>

      {/* --- DIALOGS --- */}

      {/* Unified Team Dialog */}
      <Dialog open={teamDialog} onOpenChange={setTeamDialog}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white dark:bg-slate-900 border dark:border-slate-800">
          <DialogHeader className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800">
            <DialogTitle className="text-slate-900 dark:text-slate-100">Proje Ekibi Yönetimi</DialogTitle>
            <DialogDescription>Ekip listesini görüntüleyin veya yeni personel atayın.</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="list" className="w-full">
            <div className="px-6 pt-2">
                <TabsList className="w-full grid grid-cols-2 bg-slate-100 dark:bg-slate-800">
                    <TabsTrigger value="list" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 dark:text-slate-300 dark:data-[state=active]:text-white">Ekip Listesi</TabsTrigger>
                    <TabsTrigger value="add" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 dark:text-slate-300 dark:data-[state=active]:text-white">Yeni Atama Yap</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="list" className="p-6 pt-4 h-[320px] overflow-y-auto">
                 {(project?.assignments || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                        <Users className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                        <p className="text-slate-500 dark:text-slate-400">Henüz personel atanmamış.</p>
                    </div>
                 ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                                <TableHead className="text-slate-500 dark:text-slate-400">Personel</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Kapsam</TableHead>
                                <TableHead className="text-right text-slate-500 dark:text-slate-400">İşlem</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(project?.assignments || []).map((a) => (
                                <TableRow key={a.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <TableCell className="font-medium flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={getUserAvatarUrl(a.user_id)} />
                                            <AvatarFallback className="text-xs">{getInitials(a.user_name)}</AvatarFallback>
                                        </Avatar>
                                        {a.user_name}
                                    </TableCell>
                                    <TableCell>
                                        {a.assignment_type === 'area' ? 
                                            <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800">{a.area_name}</Badge> : 
                                            <Badge className="bg-slate-800 dark:bg-slate-700 text-white">Proje Geneli</Badge>
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteAssignmentId(a.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 )}
            </TabsContent>

            <TabsContent value="add" className="p-6 pt-4 h-[320px]">
                <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kapsam</label>
                        <Select value={assignForm.assignment_type} onValueChange={(v) => setAssignForm((a) => ({ ...a, assignment_type: v }))}>
                            <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="project">Tüm Proje</SelectItem>
                                <SelectItem value="area">Belirli Alan</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                     
                     {assignForm.assignment_type === "area" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Alan</label>
                            <Select value={assignForm.area_id || "none"} onValueChange={(v) => setAssignForm((a) => ({ ...a, area_id: v === "none" ? "" : v }))}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                                <SelectContent>
                                     <SelectItem value="none">Seçiniz</SelectItem>
                                    {(project?.areas || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                     )}
                     
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Personel</label>
                        <Select value={assignForm.user_id || "none"} onValueChange={(v) => setAssignForm((a) => ({ ...a, user_id: v === "none" ? "" : v }))}>
                            <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-auto py-2">
                                <SelectValue placeholder="Personel Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Seçiniz</SelectItem>
                                {(users || []).map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={getUserAvatarUrl(u.id)} />
                                                <AvatarFallback className="text-[9px]">{getInitials(u.full_name)}</AvatarFallback>
                                            </Avatar>
                                            {u.full_name || u.email}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>

                     <div className="pt-4">
                        <Button onClick={handleAddAssignment} className="w-full">
                            <UserPlus className="h-4 w-4 mr-2" /> Atamayı Tamamla
                        </Button>
                     </div>
                </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t dark:border-slate-800">
            <Button variant="outline" onClick={() => setTeamDialog(false)} className="dark:bg-slate-800 dark:text-white dark:border-slate-700">Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Tahsilat Ekle</DialogTitle>
            <DialogDescription>Ödeme detaylarını giriniz.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Alan</label>
                <Select value={paymentForm.area_id || "none"} onValueChange={(v) => setPaymentForm((p) => ({ ...p, area_id: v === "none" ? "" : v }))}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Genel / Seçiniz</SelectItem>
                        {(project?.areas || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tutar</label>
                    <Input type="number" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tarih</label>
                    <Input type="date" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))} />
                 </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ödeme Yöntemi</label>
                <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm((p) => ({ ...p, payment_method: v }))}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="nakit">Nakit</SelectItem>
                        <SelectItem value="havale">Havale / EFT</SelectItem>
                        <SelectItem value="kredi_karti">Kredi Kartı</SelectItem>
                        <SelectItem value="cek">Çek</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notlar</label>
                <Input className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Opsiyonel açıklama..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)} className="dark:bg-slate-800 dark:text-white dark:border-slate-700">İptal</Button>
            <Button onClick={handleAddPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Drawer (Sheet) */}
      <Sheet open={taskDrawerOpen} onOpenChange={setTaskDrawerOpen}>
        <SheetContent className="w-full sm:w-[540px] p-0 flex flex-col h-full bg-slate-50 dark:bg-slate-950 border-l dark:border-slate-800">
            <div className="p-6 border-b bg-white dark:bg-slate-900 sticky top-0 z-10 dark:border-slate-800">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Badge variant="outline" className="mb-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">{activeTask?.group_name}</Badge>
                        <SheetTitle className="text-xl font-bold leading-tight text-slate-900 dark:text-slate-100">{activeTask?.work_item_name}</SheetTitle>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <Box className="h-3 w-3" /> {selectedProcessArea?.name} / {activeTask?.subtask_name}
                        </div>
                    </div>
                    <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Kapat</span>
                    </SheetClose>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Durum & Atama</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Durum</label>
                            <Select value={taskEdit.status} onValueChange={(v) => setTaskEdit((s) => ({ ...s, status: v }))}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-slate-100">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {taskStatusOptions.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            <div className="flex items-center gap-2">
                                                <o.icon className={cn("h-4 w-4", o.color)} /> {o.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Görevli</label>
                             <Select value={taskEdit.assigned_to} onValueChange={(v) => setTaskEdit((s) => ({ ...s, assigned_to: v }))}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-slate-100 h-auto py-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Atanmamış</SelectItem>
                                    {(users || []).map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src={getUserAvatarUrl(u.id)} />
                                                    <AvatarFallback className="text-[9px]">{getInitials(u.full_name)}</AvatarFallback>
                                                </Avatar>
                                                {u.full_name || u.email}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <PenLine className="h-3 w-3" /> Görev Açıklaması / Teknik Notlar
                        </label>
                        <Textarea 
                            className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-slate-100 resize-none min-h-[100px]" 
                            placeholder="Bu görevle ilgili teknik detaylar..." 
                            value={taskEdit.notes} 
                            onChange={(e) => setTaskEdit((s) => ({ ...s, notes: e.target.value }))}
                        />
                    </div>
                    
                    <Button onClick={saveTaskChanges} disabled={taskEdit.saving} variant="outline" size="sm" className="w-full h-8 text-xs">
                        {taskEdit.saving ? "Kaydediliyor..." : "Teknik Notları Kaydet"}
                    </Button>
                </div>

                <Separator className="dark:bg-slate-800" />

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Paperclip className="h-4 w-4" /> Dosyalar & Ekler
                    </h3>
                    
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="grid grid-cols-1 gap-3 mb-3">
                            <Select value={taskEdit.file_type} onValueChange={(v) => setTaskEdit((s) => ({ ...s, file_type: v }))}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-slate-100"><SelectValue placeholder="Dosya Tipi" /></SelectTrigger>
                                <SelectContent>
                                    {fileTypeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Input type="file" className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-slate-100" onChange={(e) => setTaskEdit((s) => ({ ...s, file: e.target.files?.[0] || null }))} />
                        </div>
                        <Button size="sm" variant="secondary" onClick={uploadTaskFile} disabled={taskEdit.uploading} className="w-full">
                            {taskEdit.uploading ? "Yükleniyor..." : "Dosyayı Yükle"}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {taskFiles.length === 0 ? (
                            <div className="text-xs text-center text-slate-400 dark:text-slate-500 py-2">Dosya yok.</div>
                        ) : (
                            taskFiles.map((f) => (
                                <a key={f.id} href={`${API_URL}/files/${f.id}`} target="_blank" rel="noreferrer" className="flex items-center p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group">
                                    <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 mr-3">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{f.original_name}</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{f.file_type} • {new Date(f.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <Download className="h-4 w-4 text-slate-300 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                                </a>
                            ))
                        )}
                    </div>
                </div>

                <Separator className="dark:bg-slate-800" />

                {/* COMMENTS SECTION */}
                <div className="space-y-4 pb-4">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> Yorumlar & Hareketler
                    </h3>

                    {loadingComments ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Henüz yorum yapılmamış.</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">İlk yorumu siz ekleyin.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3 group">
                                    <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-700 mt-1 shrink-0">
                                        <AvatarImage src={getUserAvatarUrl(comment.user_id)} className="object-cover" />
                                        <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                            {getInitials(comment.user_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{comment.user_name}</span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                {new Date(comment.created_at).toLocaleString('tr-TR', { 
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                                                })}
                                            </span>
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg rounded-tl-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors break-words">
                                            {comment.message}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={commentsEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Comment Input Footer */}
            <div className="p-4 border-t bg-white dark:bg-slate-900 dark:border-slate-800 sticky bottom-0 z-10">
                <form onSubmit={handleSendComment} className="flex items-end gap-2">
                    <div className="relative flex-1">
                        <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Yorum yazın..."
                            className="min-h-[44px] max-h-[120px] resize-none pr-10 py-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors rounded-xl"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendComment(e);
                                }
                            }}
                        />
                    </div>
                    <Button 
                        type="submit" 
                        size="icon" 
                        disabled={sendingComment || !newComment.trim()}
                        className={cn(
                            "h-11 w-11 rounded-xl shrink-0 transition-all",
                            newComment.trim() ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}
                    >
                        {sendingComment ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Send className="h-5 w-5" />
                        )}
                    </Button>
                </form>
            </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Alerts */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800">
            <AlertDialogHeader>
                <AlertDialogTitle className="dark:text-white">Emin misiniz?</AlertDialogTitle>
                <AlertDialogDescription className="dark:text-slate-400">Bu tahsilat kaydı kalıcı olarak silinecektir.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="dark:bg-slate-800 dark:text-white dark:border-slate-700">İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePayment} className="bg-red-600 hover:bg-red-700 dark:bg-red-900 dark:hover:bg-red-800">Sil</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAssignmentId} onOpenChange={() => setDeleteAssignmentId(null)}>
        <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800">
            <AlertDialogHeader>
                <AlertDialogTitle className="dark:text-white">Atamayı Kaldır</AlertDialogTitle>
                <AlertDialogDescription className="dark:text-slate-400">Personeli bu görevden almak istediğinize emin misiniz?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="dark:bg-slate-800 dark:text-white dark:border-slate-700">İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAssignment} className="bg-red-600 hover:bg-red-700 dark:bg-red-900 dark:hover:bg-red-800">Kaldır</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}