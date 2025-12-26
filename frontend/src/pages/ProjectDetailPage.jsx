import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  X,
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
} from "lucide-react";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const projectStatusLabels = {
  planlandi: "Planlandı",
  uretimde: "Üretimde",
  montaj: "Montaj",
  kontrol: "Kontrol",
  tamamlandi: "Tamamlandı",
};

const projectStatusStyles = {
  planlandi: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  uretimde:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  montaj:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  kontrol:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  tamamlandi:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

const taskStatusOptions = [
  { value: "bekliyor", label: "Bekliyor", icon: Clock },
  { value: "isleme_alindi", label: "İşleme Alındı", icon: Wrench },
  { value: "montaj", label: "Montajda", icon: Factory },
  { value: "uretimde", label: "Üretimde", icon: ClipboardList },
  { value: "tamamlandi", label: "Tamamlandı", icon: CheckCircle2 },
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

function IconTab({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center justify-center gap-2 w-full">
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
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

  if (t.includes("file") || msg.includes("dosya")) return Paperclip;
  if (t.includes("upload") || msg.includes("yükl")) return FileUp;

  if (t.includes("payment") || msg.includes("tahsil")) return BadgeDollarSign;

  if (t.includes("assign") || msg.includes("atandı") || msg.includes("atama"))
    return UserPlus;

  if (t.includes("status") || msg.includes("durum")) return RefreshCcw;

  if (
    t.includes("note") ||
    t.includes("comment") ||
    msg.includes("not") ||
    msg.includes("yorum")
  )
    return MessageSquare;

  if (t.includes("create") || msg.includes("oluştur")) return PlusCircle;

  if (t.includes("delete") || msg.includes("sil")) return Trash2;

  if (t.includes("update") || msg.includes("güncell")) return PenLine;

  if (t.includes("task")) return ClipboardList;

  return Activity;
}

function safeDetailText(a) {
  const d =
    a?.details ??
    a?.description ??
    a?.note ??
    a?.meta ??
    a?.data ??
    a?.payload ??
    null;

  if (!d) return "";
  if (typeof d === "string") return d.trim();
  try {
    return JSON.stringify(d);
  } catch {
    return String(d);
  }
}

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [selectedAreaId, setSelectedAreaId] = useState(null);

  const [paymentDialog, setPaymentDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [manageAssignmentsDialog, setManageAssignmentsDialog] = useState(false);

  const [deletePaymentId, setDeletePaymentId] = useState(null);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState(null);

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

  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
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

  useEffect(() => {
    if (projectId) fetchAll();
  }, [projectId]);

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
      setSelectedAreaId((prev) => prev || firstAreaId);

      setPaymentForm((p) => ({
        ...p,
        area_id: p.area_id || firstAreaId || "",
      }));
      setAssignForm((a) => ({
        ...a,
        area_id: a.area_id || firstAreaId || "",
      }));
    } catch {
      toast.error("Proje yüklenirken hata oluştu");
    }
  };

  const fetchActivities = async () => {
    try {
      const r = await axios.get(`${API_URL}/projects/${projectId}/activities`);
      setActivities(r.data || []);
    } catch {
      setActivities([]);
    }
  };

  const fetchPayments = async () => {
    try {
      const r = await axios.get(`${API_URL}/projects/${projectId}/payments`);
      setPayments(r.data || []);
    } catch {
      setPayments([]);
    }
  };

  const fetchTasks = async () => {
    try {
      const r = await axios.get(`${API_URL}/projects/${projectId}/tasks`);
      setTasks(r.data || []);
    } catch {
      setTasks([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const r = await axios.get(`${API_URL}/users`);
      setUsers(r.data || []);
    } catch {
      setUsers([]);
    }
  };

  const fetchFiles = async () => {
    try {
      const r = await axios.get(`${API_URL}/files`, {
        params: { project_id: projectId },
      });
      setFiles(r.data || []);
    } catch {
      setFiles([]);
    }
  };

  const assignedAvatars = useMemo(() => {
    const list = project?.assignments || [];
    const byKey = new Map();
    list.forEach((a) => {
      const key = a.user_id || a.user_name || a.user_email || a.id;
      if (!byKey.has(key)) byKey.set(key, a);
    });
    return Array.from(byKey.values());
  }, [project]);

  const selectedArea = useMemo(() => {
    return (project?.areas || []).find((a) => a.id === selectedAreaId) || null;
  }, [project, selectedAreaId]);

  const areaTasks = useMemo(() => {
    if (!selectedAreaId) return [];
    return (tasks || []).filter((t) => t.area_id === selectedAreaId);
  }, [tasks, selectedAreaId]);

  const processTree = useMemo(() => {
    const tree = new Map();

    for (const t of areaTasks) {
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
  }, [areaTasks]);

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
    setTaskDrawerOpen(true);
  };

  const taskFiles = useMemo(() => {
    if (!activeTask) return [];
    return (files || []).filter((f) => f.task_id === activeTask.id);
  }, [files, activeTask]);

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
      setPaymentForm((p) => ({
        ...p,
        amount: "",
        notes: "",
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "nakit",
      }));
      await Promise.all([fetchProject(), fetchPayments(), fetchActivities()]);
    } catch {
      toast.error("Tahsilat kaydedilirken hata oluştu");
    }
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;
    try {
      await axios.delete(
        `${API_URL}/projects/${projectId}/payments/${deletePaymentId}`
      );
      toast.success("Tahsilat silindi");
      setDeletePaymentId(null);
      await Promise.all([fetchProject(), fetchPayments(), fetchActivities()]);
    } catch {
      toast.error("Tahsilat silinirken hata oluştu");
    }
  };

  const handleAddAssignment = async () => {
    if (!assignForm.user_id) {
      toast.error("Personel seçmelisiniz");
      return;
    }
    if (assignForm.assignment_type === "area" && !assignForm.area_id) {
      toast.error("Alan seçmelisiniz");
      return;
    }

    try {
      await axios.post(`${API_URL}/projects/${projectId}/assignments`, {
        user_id: assignForm.user_id,
        assignment_type: assignForm.assignment_type,
        area_id: assignForm.assignment_type === "area" ? assignForm.area_id : null,
      });
      toast.success("Personel atandı");
      setAssignDialog(false);
      setAssignForm((a) => ({ ...a, user_id: "" }));
      await Promise.all([fetchProject(), fetchActivities()]);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Personel atanırken hata oluştu");
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentId) return;
    try {
      await axios.delete(
        `${API_URL}/projects/${projectId}/assignments/${deleteAssignmentId}`
      );
      toast.success("Atama kaldırıldı");
      setDeleteAssignmentId(null);
      await Promise.all([fetchProject(), fetchActivities()]);
    } catch {
      toast.error("Atama kaldırılırken hata oluştu");
    }
  };

  const saveTaskChanges = async () => {
    if (!activeTask) return;
    setTaskEdit((s) => ({ ...s, saving: true }));
    try {
      await axios.put(
        `${API_URL}/projects/${projectId}/tasks/${activeTask.id}`,
        {
          status: taskEdit.status,
          notes: taskEdit.notes,
          assigned_to:
            taskEdit.assigned_to === "unassigned" ? null : taskEdit.assigned_to,
        }
      );
      toast.success("İş kalemi güncellendi");
      await Promise.all([fetchTasks(), fetchActivities(), fetchProject()]);
    } catch {
      toast.error("Güncelleme sırasında hata oluştu");
    } finally {
      setTaskEdit((s) => ({ ...s, saving: false }));
    }
  };

  const uploadTaskFile = async () => {
    if (!activeTask || !taskEdit.file) {
      toast.error("Dosya seçmelisiniz");
      return;
    }

    setTaskEdit((s) => ({ ...s, uploading: true }));
    try {
      const fd = new FormData();
      fd.append("project_id", projectId);
      fd.append("task_id", activeTask.id);
      fd.append("file_type", taskEdit.file_type);
      fd.append("file", taskEdit.file);

      await axios.post(`${API_URL}/files/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Dosya yüklendi");
      setTaskEdit((s) => ({ ...s, file: null }));
      await Promise.all([fetchFiles(), fetchActivities()]);
    } catch {
      toast.error("Dosya yüklenirken hata oluştu");
    } finally {
      setTaskEdit((s) => ({ ...s, uploading: false }));
    }
  };

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
    saveAs(
      new Blob([out], { type: "application/octet-stream" }),
      `tahsilatlar_${project?.name || "proje"}.xlsx`
    );
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

    autoTable(doc, {
      startY: 30,
      head: [["Alan", "Tutar", "Tarih", "Yöntem", "Not"]],
      body: rows,
    });

    doc.save(`proje_${project?.name || "detay"}.pdf`);
  };

  const totals = useMemo(() => {
    const areas = project?.areas || [];
    const totalAgreed = areas.reduce(
      (acc, a) => acc + Number(a.agreed_price || 0),
      0
    );
    const totalCollected = (payments || []).reduce(
      (acc, p) => acc + Number(p.amount || 0),
      0
    );
    return { totalAgreed, totalCollected };
  }, [project, payments]);

  const totalsByArea = useMemo(() => {
    const map = new Map();
    for (const a of project?.areas || []) {
      map.set(a.id, { area: a, collected: 0 });
    }
    for (const p of payments || []) {
      if (!map.has(p.area_id)) continue;
      map.get(p.area_id).collected += Number(p.amount || 0);
    }
    return Array.from(map.values());
  }, [project, payments]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Proje bulunamadı</h2>
        <Button asChild className="mt-4">
          <Link to="/projects">Projelere Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/projects")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {project.name}
              </h1>
              <Badge
                className={cn(
                  "font-medium",
                  projectStatusStyles[project.status]
                )}
              >
                {projectStatusLabels[project.status] || project.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {project.customer_name} • {project.areas?.length || 0} alan
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
          <div className="min-w-[220px]">
            <Select
              value={selectedAreaId || "none"}
              onValueChange={(v) => setSelectedAreaId(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alan seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Alan seçilmedi</SelectItem>
                {(project.areas || []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={() => setAssignDialog(true)}>
            <Users className="mr-2 h-4 w-4" />
            Personel Ata
          </Button>

          {assignedAvatars.length > 0 ? (
            <button
              type="button"
              onClick={() => setManageAssignmentsDialog(true)}
              className="flex items-center"
              title="Atanan personeller"
            >
              <div className="flex -space-x-2">
                {assignedAvatars.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    className="h-9 w-9 rounded-full border bg-background flex items-center justify-center text-xs font-semibold"
                    title={a.user_name}
                  >
                    {getInitials(a.user_name)}
                  </div>
                ))}
              </div>
              {assignedAvatars.length > 5 ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  +{assignedAvatars.length - 5}
                </span>
              ) : null}
            </button>
          ) : null}

          <Button variant="outline" onClick={exportExcel}>
            <Wallet className="mr-2 h-4 w-4" />
            Excel
          </Button>

          <Button variant="outline" onClick={exportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="overview" className="w-full">
            <IconTab icon={LayoutDashboard} label="Genel" />
          </TabsTrigger>
          <TabsTrigger value="process" className="w-full">
            <IconTab icon={GitPullRequest} label="Süreç" />
          </TabsTrigger>
          <TabsTrigger value="finance" className="w-full">
            <IconTab icon={Receipt} label="Finans" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Proje Bilgisi</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Müşteri</div>
                    <div className="mt-1 font-semibold">{project.customer_name || "-"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Seçili Alan</div>
                    <div className="mt-1 font-semibold">{selectedArea?.name || "-"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Alan Sayısı</div>
                    <div className="mt-1 font-semibold">{project.areas?.length || 0}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Durum</div>
                    <div className="mt-1">
                      <Badge className={cn("font-medium", projectStatusStyles[project.status])}>
                        {projectStatusLabels[project.status] || project.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alanlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(project.areas || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz alan yok.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(project.areas || []).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setSelectedAreaId(a.id);
                            setActiveTab("process");
                          }}
                          className={cn(
                            "rounded-lg border p-3 text-left hover:bg-accent transition-colors",
                            selectedAreaId === a.id ? "ring-2 ring-primary/40" : ""
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{a.name}</div>
                            <Badge variant="secondary">{a.status || "-"}</Badge>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            Anlaşma: {formatCurrency(a.agreed_price || 0)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Özet</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Toplam Anlaşma</div>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {formatCurrency(totals.totalAgreed)}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Toplam Tahsilat</div>
                      <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {formatCurrency(totals.totalCollected)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="h-full overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Aktiviteler
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="max-h-[540px] overflow-y-auto pr-2">
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz aktivite yok.</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((a) => {
                        const AIcon = activityIconByType(a);
                        const detail = safeDetailText(a);

                        return (
                          <div key={a.id} className="rounded-lg border p-3">
                            <div className="flex items-start gap-2">
                              <AIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="min-w-0 w-full">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-medium truncate">
                                    {a.message || "Aktivite"}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground shrink-0">
                                    {a.created_at
                                      ? new Date(a.created_at).toLocaleString("tr-TR")
                                      : "-"}
                                  </div>
                                </div>

                                <div className="mt-1 text-xs text-muted-foreground">
                                  {a.user_name || "-"}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-2">
                                  {a.area_name ? (
                                    <Badge variant="outline">{a.area_name}</Badge>
                                  ) : null}
                                  {a.activity_type ? (
                                    <Badge variant="secondary">{a.activity_type}</Badge>
                                  ) : null}
                                </div>

                                {detail ? (
                                  <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                                    {detail}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="process" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Süreç Yönetimi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedArea ? (
                <p className="text-sm text-muted-foreground">Süreç görmek için bir alan seçin.</p>
              ) : processTree.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bu alanda iş kalemi bulunamadı.</p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {processTree.map((g) => {
                    const StageIcon = pickStageIcon(g.groupName);
                    const groupTasks = g.subs.flatMap((s) =>
                      s.workItems.flatMap((wi) => wi.tasks)
                    );
                    const groupProgress = calcProgressFromTasks(groupTasks);

                    return (
                      <AccordionItem
                        key={g.groupName}
                        value={`g:${g.groupName}`}
                        className="border rounded-lg mb-3 px-4"
                      >
                        <AccordionTrigger className="no-underline hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center gap-2">
                              <StageIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{g.groupName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">%{groupProgress}</Badge>
                              <Badge variant="outline">
                                {g.subs.reduce((acc, s) => acc + s.workItems.length, 0)} iş kalemi
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="pt-2">
                          <Accordion type="multiple" className="w-full">
                            {g.subs.map((s) => {
                              const subTasks = s.workItems.flatMap((wi) => wi.tasks);
                              const subProgress = calcProgressFromTasks(subTasks);

                              return (
                                <AccordionItem
                                  key={`${g.groupName}-${s.subName}`}
                                  value={`s:${g.groupName}:${s.subName}`}
                                  className="border rounded-lg mb-3 px-4"
                                >
                                  <AccordionTrigger className="no-underline hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-2">
                                      <div className="flex items-center gap-2">
                                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{s.subName}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary">%{subProgress}</Badge>
                                        <Badge variant="outline">{s.workItems.length} iş kalemi</Badge>
                                      </div>
                                    </div>
                                  </AccordionTrigger>

                                  <AccordionContent className="pt-2">
                                    <div className="space-y-2">
                                      {s.workItems.map((wi) => {
                                        const mainTask = wi.tasks?.[0] || null;
                                        const status = mainTask?.status || "bekliyor";
                                        const opt = taskStatusOptions.find((x) => x.value === status);
                                        const StatusIcon = opt?.icon || Clock;

                                        return (
                                          <button
                                            key={`${g.groupName}-${s.subName}-${wi.workItemName}`}
                                            type="button"
                                            onClick={() => openTaskDrawer(mainTask)}
                                            className="w-full rounded-lg border px-3 py-2 hover:bg-accent transition-colors"
                                          >
                                            <div className="flex items-center justify-between gap-3">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <StatusIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <div className="min-w-0">
                                                  <div className="font-medium truncate">{wi.workItemName}</div>
                                                  <div className="text-xs text-muted-foreground truncate">
                                                    {selectedArea?.name || "-"}
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2 shrink-0">
                                                <Badge variant="secondary">{opt?.label || status}</Badge>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                              </div>
                                            </div>

                                            <div className="mt-2">
                                              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                                                <div
                                                  className="absolute left-0 top-0 h-full bg-primary/80"
                                                  style={{ width: `${wi.progress}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-primary-foreground">
                                                  %{wi.progress}
                                                </div>
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Finans Özeti</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Toplam Anlaşma</div>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-lg font-semibold">
                  {formatCurrency(totals.totalAgreed)}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Toplam Tahsilat</div>
                  <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-lg font-semibold">
                  {formatCurrency(totals.totalCollected)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Alan Bazlı</CardTitle>
              <Button onClick={() => setPaymentDialog(true)}>Tahsilat Ekle</Button>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {totalsByArea.length === 0 ? (
                <p className="text-sm text-muted-foreground">Alan yok.</p>
              ) : (
                totalsByArea.map(({ area, collected }) => (
                  <div key={area.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{area.name}</div>
                      <Badge variant="outline">{area.status || "-"}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Anlaşma: {formatCurrency(area.agreed_price || 0)}
                    </div>
                    <div className="mt-1 text-sm">
                      Tahsilat: <span className="font-semibold">{formatCurrency(collected)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tahsilat Listesi</CardTitle>
            </CardHeader>
            <CardContent>
              {(payments || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz tahsilat yok.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alan</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Yöntem</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            {project?.areas?.find((a) => a.id === p.area_id)?.name || "-"}
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                          <TableCell>{p.payment_date || "-"}</TableCell>
                          <TableCell>{p.payment_method || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" onClick={() => setDeletePaymentId(p.id)}>
                              Sil
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Tahsilat Ekle</DialogTitle>
            <DialogDescription>Seçili alana tahsilat ekleyin.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Alan</div>
              <Select
                value={paymentForm.area_id || "none"}
                onValueChange={(v) =>
                  setPaymentForm((p) => ({ ...p, area_id: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alan seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçiniz</SelectItem>
                  {(project.areas || []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Tutar</div>
              <Input
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Tarih</div>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Yöntem</div>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(v) => setPaymentForm((p) => ({ ...p, payment_method: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nakit">Nakit</SelectItem>
                  <SelectItem value="havale">Havale</SelectItem>
                  <SelectItem value="kredi_karti">Kredi Kartı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Not</div>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleAddPayment}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Personel Ata</DialogTitle>
            <DialogDescription>Projeye veya alana personel atayın.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Atama Tipi</div>
              <Select
                value={assignForm.assignment_type}
                onValueChange={(v) => setAssignForm((a) => ({ ...a, assignment_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Proje</SelectItem>
                  <SelectItem value="area">Alan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignForm.assignment_type === "area" ? (
              <div className="grid gap-2">
                <div className="text-sm font-medium">Alan</div>
                <Select
                  value={assignForm.area_id || "none"}
                  onValueChange={(v) =>
                    setAssignForm((a) => ({ ...a, area_id: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alan seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçiniz</SelectItem>
                    {(project.areas || []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <div className="text-sm font-medium">Personel</div>
              <Select
                value={assignForm.user_id || "none"}
                onValueChange={(v) =>
                  setAssignForm((a) => ({ ...a, user_id: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçiniz</SelectItem>
                  {(users || []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleAddAssignment}>Ata</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageAssignmentsDialog} onOpenChange={setManageAssignmentsDialog}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Atanan Personeller</DialogTitle>
            <DialogDescription>Projeye/alanlara atanmış personeller.</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personel</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Alan</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(project.assignments || []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.user_name || "-"}</TableCell>
                    <TableCell>{a.assignment_type === "area" ? "Alan" : "Proje"}</TableCell>
                    <TableCell>{a.area_name || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" onClick={() => setDeleteAssignmentId(a.id)}>
                        Sil
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageAssignmentsDialog(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tahsilatı sil</AlertDialogTitle>
            <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAssignmentId} onOpenChange={() => setDeleteAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atamayı kaldır</AlertDialogTitle>
            <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssignment}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={taskDrawerOpen} onOpenChange={setTaskDrawerOpen}>
        <SheetContent className="w-[420px] sm:w-[480px] p-0">
          <div className="h-screen flex flex-col">
            <SheetHeader className="px-5 py-4 border-b">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="truncate">
                    {activeTask?.work_item_name || "İş Kalemi"}
                  </SheetTitle>
                  <div className="text-xs text-muted-foreground truncate">
                    {selectedArea?.name || "-"} • {activeTask?.subtask_name || "-"} •{" "}
                    {activeTask?.group_name || "-"}
                  </div>
                </div>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Görev
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Durum</div>
                    <Select
                      value={taskEdit.status}
                      onValueChange={(v) => setTaskEdit((s) => ({ ...s, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Durum seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskStatusOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Görevli</div>
                    <Select
                      value={taskEdit.assigned_to}
                      onValueChange={(v) => setTaskEdit((s) => ({ ...s, assigned_to: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Görevli seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Atama yok</SelectItem>
                        {(users || []).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Not</div>
                    <Textarea
                      value={taskEdit.notes}
                      onChange={(e) => setTaskEdit((s) => ({ ...s, notes: e.target.value }))}
                      placeholder="Not ekleyin..."
                      className="min-h-[90px]"
                    />
                  </div>

                  <Button onClick={saveTaskChanges} disabled={taskEdit.saving} className="w-full">
                    {taskEdit.saving ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Dosyalar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Dosya Türü</div>
                    <Select
                      value={taskEdit.file_type}
                      onValueChange={(v) => setTaskEdit((s) => ({ ...s, file_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tür seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {fileTypeOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Dosya Seç</div>
                    <Input
                      type="file"
                      onChange={(e) =>
                        setTaskEdit((s) => ({ ...s, file: e.target.files?.[0] || null }))
                      }
                    />
                  </div>

                  <Button
                    variant="secondary"
                    onClick={uploadTaskFile}
                    disabled={taskEdit.uploading}
                    className="w-full"
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    {taskEdit.uploading ? "Yükleniyor..." : "Yükle"}
                  </Button>

                  {taskFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz dosya yok.</p>
                  ) : (
                    <div className="space-y-2">
                      {taskFiles.map((f) => (
                        <a
                          key={f.id}
                          href={`${process.env.REACT_APP_BACKEND_URL}/api/files/${f.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border p-2 hover:bg-accent"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{f.original_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {(f.file_type || "diger").toUpperCase()} •{" "}
                              {f.created_at ? new Date(f.created_at).toLocaleString("tr-TR") : "-"}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="px-5 py-4 border-t bg-background">
              <Button variant="outline" className="w-full" onClick={() => setTaskDrawerOpen(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
