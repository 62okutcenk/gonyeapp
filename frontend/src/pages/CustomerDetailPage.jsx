import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  HardHat,
  Briefcase,
  Pencil,
  MessageCircle,
  FolderKanban,
  Wallet,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  Calendar,
  CreditCard,
  Upload,
  Download,
  Trash2,
  ReceiptText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const customerTypes = [
  { value: "bireysel", label: "Bireysel", icon: User, color: "bg-blue-100 text-blue-700" },
  { value: "mimar", label: "Mimar", icon: Building2, color: "bg-purple-100 text-purple-700" },
  { value: "muteahhit", label: "Müteahhit", icon: HardHat, color: "bg-orange-100 text-orange-700" },
  { value: "kurumsal", label: "Kurumsal", icon: Briefcase, color: "bg-green-100 text-green-700" },
];

const projectStatuses = {
  planlandi: { label: "Planlandı", color: "bg-blue-100 text-blue-700", icon: Clock },
  uretimde: { label: "Üretimde", color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
  montaj: { label: "Montaj", color: "bg-purple-100 text-purple-700", icon: AlertCircle },
  kontrol: { label: "Kontrol", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
  tamamlandi: { label: "Tamamlandı", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  iptal: { label: "İptal", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

const getTypeInfo = (type) => {
  return customerTypes.find(t => t.value === type) || customerTypes[0];
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: "bireysel",
    name: "",
    phone: "",
    email: "",
    address: "",
    tax_office: "",
    tax_number: "",
    referral_source: "",
    notes: "",
  });

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const [customerRes, statsRes, projectsRes] = await Promise.all([
        axios.get(`${API_URL}/customers/${id}`),
        axios.get(`${API_URL}/customers/${id}/stats`),
        axios.get(`${API_URL}/customers/${id}/projects`),
      ]);
      
      setCustomer(customerRes.data);
      setStats(statsRes.data);
      setProjects(projectsRes.data);
      
      // Set form data
      setForm({
        type: customerRes.data.type || "bireysel",
        name: customerRes.data.name || "",
        phone: customerRes.data.phone || "",
        email: customerRes.data.email || "",
        address: customerRes.data.address || "",
        tax_office: customerRes.data.tax_office || "",
        tax_number: customerRes.data.tax_number || "",
        referral_source: customerRes.data.referral_source || "",
        notes: customerRes.data.notes || "",
      });
    } catch (error) {
      toast.error("Müşteri bilgileri yüklenemedi");
      navigate("/customers");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("İsim ve telefon zorunludur");
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${API_URL}/customers/${id}`, form);
      toast.success("Müşteri güncellendi");
      setEditDialogOpen(false);
      fetchCustomerData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Güncelleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const cleanPhone = customer.phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("0") ? "90" + cleanPhone.slice(1) : cleanPhone;
      window.open(`https://wa.me/${formattedPhone}`, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const typeInfo = getTypeInfo(customer.type);
  const TypeIcon = typeInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-muted-foreground">Müşteri Detayları</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Panel - Profile Card */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className={cn(
                  "h-20 w-20 rounded-full flex items-center justify-center mb-4",
                  typeInfo.color.split(" ")[0]
                )}>
                  <span className={cn("font-bold text-2xl", typeInfo.color.split(" ")[1])}>
                    {customer.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-semibold">{customer.name}</h2>
                <Badge variant="secondary" className={cn("mt-2", typeInfo.color)}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeInfo.label}
                </Badge>
              </div>

              <Separator className="my-4" />

              {/* Contact Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                </div>

                {customer.email && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">E-posta</p>
                      <p className="font-medium">{customer.email}</p>
                    </div>
                  </div>
                )}

                {customer.address && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Adres</p>
                      <p className="font-medium text-sm">{customer.address}</p>
                    </div>
                  </div>
                )}

                {(customer.tax_office || customer.tax_number) && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <ReceiptText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Vergi Bilgileri</p>
                      <p className="font-medium text-sm">
                        {customer.tax_office && `${customer.tax_office} V.D.`}
                        {customer.tax_office && customer.tax_number && " - "}
                        {customer.tax_number}
                      </p>
                    </div>
                  </div>
                )}

                {customer.referral_source && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Referans</p>
                      <p className="font-medium text-sm">{customer.referral_source}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Düzenle
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {customer.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Notlar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="projects" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="projects" className="gap-2">
                <FolderKanban className="h-4 w-4" />
                Projeler
              </TabsTrigger>
              <TabsTrigger value="financial" className="gap-2">
                <Wallet className="h-4 w-4" />
                Finansal
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-2">
                <FileText className="h-4 w-4" />
                Dosyalar
              </TabsTrigger>
            </TabsList>

            {/* Projects Tab */}
            <TabsContent value="projects" className="space-y-4">
              {/* Stats Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FolderKanban className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats?.total_projects || 0}</p>
                        <p className="text-xs text-muted-foreground">Toplam Proje</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats?.active_projects || 0}</p>
                        <p className="text-xs text-muted-foreground">Aktif Proje</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats?.completed_projects || 0}</p>
                        <p className="text-xs text-muted-foreground">Tamamlanan</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Projects Table */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Projeler</CardTitle>
                    <Button size="sm" onClick={() => navigate("/projects/new")}>
                      Yeni Proje
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FolderKanban className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Bu müşteriye ait proje bulunmuyor
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proje</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="text-right">Tutar</TableHead>
                          <TableHead className="text-right">Bakiye</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects.map((project) => {
                          const status = projectStatuses[project.status] || projectStatuses.planlandi;
                          const StatusIcon = status.icon;
                          
                          return (
                            <TableRow 
                              key={project.id}
                              className="cursor-pointer"
                              onClick={() => navigate(`/projects/${project.id}`)}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">{project.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(project.created_at)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={status.color}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(project.total_agreed || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {project.total_remaining > 0 ? (
                                  <span className="text-red-600 font-medium">
                                    {formatCurrency(project.total_remaining)}
                                  </span>
                                ) : project.total_agreed > 0 ? (
                                  <span className="text-green-600 font-medium">
                                    Ödendi
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial" className="space-y-4">
              {/* Financial Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{formatCurrency(stats?.total_revenue || 0)}</p>
                        <p className="text-xs text-muted-foreground">Toplam Ciro</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{formatCurrency(stats?.total_collected || 0)}</p>
                        <p className="text-xs text-muted-foreground">Tahsil Edilen</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={stats?.total_remaining > 0 ? "border-red-200" : ""}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        stats?.total_remaining > 0 ? "bg-red-100" : "bg-gray-100"
                      )}>
                        <TrendingDown className={cn(
                          "h-5 w-5",
                          stats?.total_remaining > 0 ? "text-red-600" : "text-gray-400"
                        )} />
                      </div>
                      <div>
                        <p className={cn(
                          "text-xl font-bold",
                          stats?.total_remaining > 0 ? "text-red-600" : ""
                        )}>
                          {formatCurrency(stats?.total_remaining || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Kalan Bakiye</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Progress by Project */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Proje Bazlı Tahsilat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Henüz proje bulunmuyor
                    </p>
                  ) : (
                    projects.map((project) => {
                      const progress = project.total_agreed > 0 
                        ? (project.total_collected / project.total_agreed) * 100 
                        : 0;
                      
                      return (
                        <div key={project.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Link 
                              to={`/projects/${project.id}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {project.name}
                            </Link>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(project.total_collected || 0)} / {formatCurrency(project.total_agreed || 0)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                progress >= 100 ? "bg-green-500" : "bg-primary"
                              )}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Dosyalar</CardTitle>
                      <CardDescription>
                        Sözleşmeler, kimlik fotokopileri ve diğer belgeler
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Dosya Yükle
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-sm font-medium">Henüz dosya yok</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Müşteriye ait belgeleri buraya yükleyebilirsiniz
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Müşteri Düzenle</DialogTitle>
            <DialogDescription>
              Müşteri bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Müşteri Tipi</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tip seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">İsim / Firma Adı *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon *</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_office">Vergi Dairesi</Label>
                <Input
                  id="tax_office"
                  value={form.tax_office}
                  onChange={(e) => setForm({ ...form, tax_office: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_number">Vergi No / TC</Label>
                <Input
                  id="tax_number"
                  value={form.tax_number}
                  onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral_source">Referans Kaynağı</Label>
              <Input
                id="referral_source"
                value={form.referral_source}
                onChange={(e) => setForm({ ...form, referral_source: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
