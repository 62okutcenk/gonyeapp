import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  Edit2,
  Upload,
  FileText,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const statusLabels = {
  bekliyor: "Bekliyor",
  planlandi: "Planlandı",
  uretimde: "Üretimde",
  kontrol: "Kontrol",
  tamamlandi: "Tamamlandı",
};

const statusStyles = {
  bekliyor: "status-bekliyor",
  planlandi: "status-planlandi",
  uretimde: "status-uretimde",
  kontrol: "status-kontrol",
  tamamlandi: "status-tamamlandi",
};

const statusOrder = ["bekliyor", "planlandi", "uretimde", "kontrol", "tamamlandi"];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchUsers();
    fetchFiles();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      console.error("Failed to fetch project:", error);
      toast.error("Proje yüklenirken hata oluştu");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/files?project_id=${id}`);
      setFiles(response.data);
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await axios.put(`${API_URL}/projects/${id}/tasks/${taskId}`, {
        status: newStatus,
      });
      toast.success("Görev durumu güncellendi");
      fetchProject();
    } catch (error) {
      toast.error("Görev güncellenirken hata oluştu");
    }
  };

  const handleTaskAssign = async (taskId, userId) => {
    try {
      await axios.put(`${API_URL}/projects/${id}/tasks/${taskId}`, {
        status: project.tasks.find((t) => t.id === taskId)?.status || "bekliyor",
        assigned_to: userId || null,
      });
      toast.success("Görev atandı");
      fetchProject();
    } catch (error) {
      toast.error("Görev atanırken hata oluştu");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_URL}/files/upload?project_id=${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Dosya yüklendi");
      fetchFiles();
    } catch (error) {
      toast.error("Dosya yüklenirken hata oluştu");
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileId) => {
    try {
      await axios.delete(`${API_URL}/files/${fileId}`);
      toast.success("Dosya silindi");
      fetchFiles();
    } catch (error) {
      toast.error("Dosya silinirken hata oluştu");
    }
  };

  // Group tasks by group
  const tasksByGroup = project?.tasks?.reduce((acc, task) => {
    if (!acc[task.group_name]) {
      acc[task.group_name] = {};
    }
    if (!acc[task.group_name][task.work_item_name]) {
      acc[task.group_name][task.work_item_name] = [];
    }
    acc[task.group_name][task.work_item_name].push(task);
    return acc;
  }, {});

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in" data-testid="project-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge className={cn(statusStyles[project.status])}>
                {statusLabels[project.status]}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress & Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Proje İlerlemesi</CardTitle>
            <CardDescription>
              Toplam {project.tasks?.length || 0} görevden{" "}
              {project.tasks?.filter((t) => t.status === "tamamlandi").length || 0} tanesi tamamlandı
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">%{Math.round(project.progress)}</span>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {project.tasks?.filter((t) => t.status !== "tamamlandi").length || 0} bekleyen
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>
                      {project.tasks?.filter((t) => t.status === "tamamlandi").length || 0} tamamlanan
                    </span>
                  </div>
                </div>
              </div>
              <Progress value={project.progress} className="h-3" />
            </div>

            {/* Work Items Summary */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium mb-4">İş Kalemleri</h4>
              <div className="flex flex-wrap gap-2">
                {project.work_items?.map((item, index) => (
                  <Badge key={index} variant="outline" className="gap-2">
                    <Package className="h-3 w-3" />
                    {item.work_item_name} x{item.quantity}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Müşteri Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.customer_name && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Müşteri</p>
                  <p className="font-medium">{project.customer_name}</p>
                </div>
              </div>
            )}
            {project.customer_phone && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefon</p>
                  <p className="font-medium">{project.customer_phone}</p>
                </div>
              </div>
            )}
            {project.customer_address && (
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adres</p>
                  <p className="font-medium">{project.customer_address}</p>
                </div>
              </div>
            )}
            {project.due_date && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teslim Tarihi</p>
                  <p className="font-medium">
                    {new Date(project.due_date).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
            {!project.customer_name && !project.customer_phone && !project.customer_address && !project.due_date && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Müşteri bilgisi girilmemiş
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks & Files Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks" data-testid="tasks-tab">
            Görevler
          </TabsTrigger>
          <TabsTrigger value="files" data-testid="files-tab">
            Dosyalar ({files.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          {Object.keys(tasksByGroup || {}).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Henüz görev bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(tasksByGroup).map(([groupName, workItems]) => (
                <Card key={groupName}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      {groupName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Object.entries(workItems).map(([workItemName, tasks]) => (
                        <div key={workItemName}>
                          <h4 className="text-sm font-medium text-muted-foreground mb-3">
                            {workItemName}
                          </h4>
                          <div className="space-y-2">
                            {tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                data-testid={`task-${task.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      task.status === "tamamlandi"
                                        ? "bg-green-500"
                                        : task.status === "uretimde"
                                        ? "bg-yellow-500"
                                        : task.status === "planlandi"
                                        ? "bg-blue-500"
                                        : "bg-slate-400"
                                    )}
                                  />
                                  <span className="font-medium">{task.subtask_name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {/* Assignee */}
                                  <Select
                                    value={task.assigned_to || "unassigned"}
                                    onValueChange={(value) =>
                                      handleTaskAssign(task.id, value === "unassigned" ? null : value)
                                    }
                                  >
                                    <SelectTrigger className="w-36 h-8">
                                      <SelectValue>
                                        {task.assigned_to_name || "Atanmadı"}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">Atanmadı</SelectItem>
                                      {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                              <AvatarFallback
                                                style={{ backgroundColor: user.color }}
                                                className="text-[10px] text-white"
                                              >
                                                {getInitials(user.full_name)}
                                              </AvatarFallback>
                                            </Avatar>
                                            {user.full_name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {/* Status */}
                                  <Select
                                    value={task.status}
                                    onValueChange={(value) => handleTaskStatusChange(task.id, value)}
                                  >
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue>
                                        <Badge className={cn("text-xs", statusStyles[task.status])}>
                                          {statusLabels[task.status]}
                                        </Badge>
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {statusOrder.map((status) => (
                                        <SelectItem key={status} value={status}>
                                          <Badge className={cn("text-xs", statusStyles[status])}>
                                            {statusLabels[status]}
                                          </Badge>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Proje Dosyaları</CardTitle>
                  <CardDescription>
                    Projeye ait teknik çizimler, fotoğraflar ve dökümanlar
                  </CardDescription>
                </div>
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Button
                    asChild
                    disabled={uploading}
                    data-testid="upload-file-button"
                  >
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Yükleniyor..." : "Dosya Yükle"}
                    </label>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">Henüz dosya yüklenmemiş</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.original_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => window.open(`${API_URL}/files/${file.id}`, "_blank")}
                          >
                            İndir
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleFileDelete(file.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
