import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  Wallet,
  Plus,
  Trash2,
  Package,
  Users,
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  CreditCard,
  Banknote,
  Building2,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const statusLabels = {
  planlandi: "Planlandı",
  uretimde: "Üretimde",
  montaj: "Montaj",
  tamamlandi: "Tamamlandı",
  bekliyor: "Bekliyor",
};

const statusStyles = {
  planlandi: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  uretimde: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  montaj: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  tamamlandi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  bekliyor: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
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
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Dialogs
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState(null);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState(null);

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

  useEffect(() => {
    fetchProject();
    fetchActivities();
    fetchPayments();
    fetchTasks();
    fetchUsers();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error("Failed to fetch project:", error);
      toast.error("Proje yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects/${projectId}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects/${projectId}/payments`);
      setPayments(response.data);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects/${projectId}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
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
      setAssignForm({ user_id: "", assignment_type: "project", area_id: "" });
      fetchProject();
      fetchActivities();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Personel atanırken hata oluştu");
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentId) return;
    try {
      await axios.delete(`${API_URL}/projects/${projectId}/assignments/${deleteAssignmentId}`);
      toast.success("Atama kaldırıldı");
      setDeleteAssignmentId(null);
      fetchProject();
      fetchActivities();
    } catch (error) {
      toast.error("Atama kaldırılırken hata oluştu");
    }
  };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <Badge className={cn("font-medium", statusStyles[project.status])}>
                {statusLabels[project.status] || project.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {project.customer_name} • {project.areas?.length || 0} alan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAssignDialog(true)}>
            <Users className="mr-2 h-4 w-4" />
            Personel Ata
          </Button>
          <Button onClick={() => setPaymentDialog(true)}>
            <Wallet className="mr-2 h-4 w-4" />
            Tahsilat Ekle
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Bedel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(project.finance?.total_agreed || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tahsil Edilen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(project.finance?.total_collected || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kalan Borç
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(project.finance?.total_remaining || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              İlerleme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(project.progress || 0)}%</div>
            <Progress value={project.progress || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Genel</TabsTrigger>
          <TabsTrigger value="areas">Çalışma Alanları</TabsTrigger>
          <TabsTrigger value="finance">Finans</TabsTrigger>
          <TabsTrigger value="team">Ekip</TabsTrigger>
          <TabsTrigger value="activities">Aktiviteler</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Müşteri Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{project.customer_name}</span>
                </div>
                {project.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{project.customer_phone}</span>
                  </div>
                )}
                {project.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{project.customer_email}</span>
                  </div>
                )}
                {project.due_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Termin: {new Date(project.due_date).toLocaleDateString("tr-TR")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proje Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && (
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Oluşturan: </span>
                  {project.created_by_name}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Oluşturulma: </span>
                  {new Date(project.created_at).toLocaleDateString("tr-TR")}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Areas Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Çalışma Alanları Özeti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.areas?.map((area) => (
                  <div key={area.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{area.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {area.work_items?.length || 0} iş kalemi
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={cn("mb-1", statusStyles[area.status])}>
                        {statusLabels[area.status]}
                      </Badge>
                      <p className="text-sm font-medium">{formatCurrency(area.agreed_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Areas Tab */}
        <TabsContent value="areas" className="space-y-4">
          {project.areas?.map((area) => (
            <Card key={area.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{area.name}</CardTitle>
                    <CardDescription>
                      {area.city && `${area.city}`}
                      {area.district && `, ${area.district}`}
                      {area.address && ` - ${area.address}`}
                    </CardDescription>
                  </div>
                  <Badge className={statusStyles[area.status]}>
                    {statusLabels[area.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Area Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>İlerleme</span>
                    <span className="font-medium">{Math.round(area.progress || 0)}%</span>
                  </div>
                  <Progress value={area.progress || 0} className="h-2" />
                </div>

                {/* Area Finance */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Anlaşma</p>
                    <p className="font-semibold">{formatCurrency(area.agreed_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tahsil</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(area.collected_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kalan</p>
                    <p className="font-semibold text-orange-600">
                      {formatCurrency(area.remaining_amount)}
                    </p>
                  </div>
                </div>

                {/* Work Items */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    İş Kalemleri
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {area.work_items?.map((wi, idx) => (
                      <Badge key={idx} variant="outline">
                        {wi.work_item_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tahsilat Geçmişi</CardTitle>
                <Button onClick={() => setPaymentDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tahsilat Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz tahsilat kaydı yok
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => {
                    const MethodIcon = paymentMethods[payment.payment_method]?.icon || Wallet;
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <MethodIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.area_name} •{" "}
                              {paymentMethods[payment.payment_method]?.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm">
                              {new Date(payment.payment_date).toLocaleDateString("tr-TR")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.created_by_name}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeletePaymentId(payment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Area Finance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alan Bazında Finans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.finance?.areas_summary?.map((area) => (
                  <div key={area.area_id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{area.area_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((area.collected / area.agreed) * 100) || 0}% tahsil edildi
                      </span>
                    </div>
                    <Progress
                      value={(area.collected / area.agreed) * 100 || 0}
                      className="h-2 mb-2"
                    />
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Anlaşma: </span>
                        {formatCurrency(area.agreed)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tahsil: </span>
                        <span className="text-green-600">{formatCurrency(area.collected)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kalan: </span>
                        <span className="text-orange-600">{formatCurrency(area.remaining)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Atanan Personeller</CardTitle>
                <Button onClick={() => setAssignDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Personel Ata
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {project.assignments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz personel atanmamış
                </div>
              ) : (
                <div className="space-y-3">
                  {project.assignments?.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{assignment.user_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.assignment_type === "project"
                              ? "Tüm Projeye Erişim"
                              : `${assignment.area_name} Alanı`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteAssignmentId(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Aktivite Geçmişi
              </CardTitle>
              <CardDescription>
                Projede yapılan tüm işlemler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Henüz aktivite yok
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity, index) => {
                      const Icon = activityIcons[activity.action] || Clock;
                      return (
                        <div key={activity.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            {index < activities.length - 1 && (
                              <div className="w-px h-full bg-border flex-1 mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-sm">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {activity.user_name}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(activity.created_at).toLocaleString("tr-TR")}
                              </span>
                              {activity.area_name && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <Badge variant="outline" className="text-xs h-5">
                                    {activity.area_name}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tahsilat Ekle</DialogTitle>
            <DialogDescription>
              Alanı seçip tahsilat tutarını girin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Alan *</Label>
              <Select
                value={paymentForm.area_id}
                onValueChange={(value) =>
                  setPaymentForm((prev) => ({ ...prev, area_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alan seçin" />
                </SelectTrigger>
                <SelectContent>
                  {project.areas?.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name} (Kalan: {formatCurrency(area.remaining_amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tutar (₺) *</Label>
              <Input
                type="number"
                min="0"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Tarih</Label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Ödeme Yöntemi</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) =>
                  setPaymentForm((prev) => ({ ...prev, payment_method: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethods).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="İsteğe bağlı..."
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

      {/* Assignment Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personel Ata</DialogTitle>
            <DialogDescription>
              Projeye veya belirli bir alana personel atayın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Personel *</Label>
              <Select
                value={assignForm.user_id}
                onValueChange={(value) =>
                  setAssignForm((prev) => ({ ...prev, user_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Atama Türü</Label>
              <Select
                value={assignForm.assignment_type}
                onValueChange={(value) =>
                  setAssignForm((prev) => ({ ...prev, assignment_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Tüm Projeye Erişim</SelectItem>
                  <SelectItem value="area">Belirli Alana Erişim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignForm.assignment_type === "area" && (
              <div className="space-y-2">
                <Label>Alan *</Label>
                <Select
                  value={assignForm.area_id}
                  onValueChange={(value) =>
                    setAssignForm((prev) => ({ ...prev, area_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alan seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {project.areas?.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleAddAssignment}>Ata</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Dialog */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tahsilatı silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Assignment Dialog */}
      <AlertDialog open={!!deleteAssignmentId} onOpenChange={() => setDeleteAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atamayı kaldırmak istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Personelin projeye erişimi kaldırılacaktır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssignment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Kaldır
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
