import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  User,
  HardHat,
  Briefcase,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  UserPlus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const customerTypes = [
  { value: "bireysel", label: "Bireysel", icon: User, color: "bg-blue-100 text-blue-700" },
  { value: "mimar", label: "Mimar", icon: Building2, color: "bg-purple-100 text-purple-700" },
  { value: "muteahhit", label: "Müteahhit", icon: HardHat, color: "bg-orange-100 text-orange-700" },
  { value: "kurumsal", label: "Kurumsal", icon: Briefcase, color: "bg-green-100 text-green-700" },
];

const getTypeInfo = (type) => {
  return customerTypes.find(t => t.value === type) || customerTypes[0];
};

export default function CustomersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customerStats, setCustomerStats] = useState({});

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
    fetchCustomers();
  }, [searchQuery, typeFilter]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      // "all" kontrolü eklendi, böylece tüm tipleri seçince parametre gönderilmez
      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter);
      
      const response = await axios.get(`${API_URL}/customers?${params.toString()}`);
      setCustomers(response.data);
      
      // Fetch stats for each customer
      const statsPromises = response.data.map(c => 
        axios.get(`${API_URL}/customers/${c.id}/stats`).then(res => ({ id: c.id, stats: res.data }))
      );
      const statsResults = await Promise.all(statsPromises);
      const statsMap = {};
      statsResults.forEach(s => { statsMap[s.id] = s.stats; });
      setCustomerStats(statsMap);
    } catch (error) {
      toast.error("Müşteriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
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
    setEditingCustomer(null);
  };

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setForm({
        type: customer.type || "bireysel",
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        tax_office: customer.tax_office || "",
        tax_number: customer.tax_number || "",
        referral_source: customer.referral_source || "",
        notes: customer.notes || "",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("İsim ve telefon zorunludur");
      return;
    }

    setSaving(true);
    try {
      if (editingCustomer) {
        await axios.put(`${API_URL}/customers/${editingCustomer.id}`, form);
        toast.success("Müşteri güncellendi");
      } else {
        await axios.post(`${API_URL}/customers`, form);
        toast.success("Müşteri oluşturuldu");
      }
      setDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "İşlem başarısız");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!confirm(`"${customer.name}" müşterisini silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/customers/${customer.id}`);
      toast.success("Müşteri silindi");
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Silme işlemi başarısız");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Müşteriler</h1>
          <p className="text-muted-foreground">
            Müşteri portföyünüzü yönetin ve takip edin
          </p>
        </div>
        {hasPermission("customers.manage") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <UserPlus className="h-4 w-4 mr-2" />
                Yeni Müşteri
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? "Müşteri Düzenle" : "Yeni Müşteri"}
                </DialogTitle>
                <DialogDescription>
                  Müşteri bilgilerini girin
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
                    placeholder="Ahmet Yılmaz"
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
                    placeholder="0 (5xx) xxx xx xx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Fatura / Sabit adres"
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
                    placeholder="Vergi dairesi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_number">Vergi No / TC</Label>
                  <Input
                    id="tax_number"
                    value={form.tax_number}
                    onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                    placeholder="Vergi numarası"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral_source">Referans Kaynağı</Label>
                <Input
                  id="referral_source"
                  value={form.referral_source}
                  onChange={(e) => setForm({ ...form, referral_source: e.target.value })}
                  placeholder="Bizi nereden buldu?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="CRM notları..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCustomer ? "Güncelle" : "Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.length}</p>
                <p className="text-sm text-muted-foreground">Toplam Müşteri</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {customerTypes.slice(0, 3).map((type) => {
          const count = customers.filter(c => c.type === type.value).length;
          return (
            <Card key={type.value}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", type.color.split(" ")[0])}>
                    <type.icon className={cn("h-6 w-6", type.color.split(" ")[1])} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">{type.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="İsim, telefon veya e-posta ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tüm Tipler" />
          </SelectTrigger>
          <SelectContent>
            {/* HATA DUZELTİLDİ: value="" yerine value="all" yapıldı */}
            <SelectItem value="all">Tüm Tipler</SelectItem>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Henüz müşteri yok</h3>
              <p className="text-sm text-muted-foreground mt-1">
                İlk müşterinizi ekleyerek başlayın
              </p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Müşteri Ekle
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead className="text-right">Toplam Ciro</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const typeInfo = getTypeInfo(customer.type);
                  const stats = customerStats[customer.id] || {};
                  const IconComponent = typeInfo.icon;
                  
                  return (
                    <TableRow 
                      key={customer.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                            typeInfo.color.split(" ")[0]
                          )}>
                            <span className={cn("font-semibold text-sm", typeInfo.color.split(" ")[1])}>
                              {customer.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            {stats.total_projects > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {stats.total_projects} proje
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("font-normal", typeInfo.color)}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(stats.total_revenue || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {stats.total_remaining > 0 ? (
                          <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                            <TrendingDown className="h-3 w-3" />
                            {formatCurrency(stats.total_remaining)}
                          </span>
                        ) : stats.total_revenue > 0 ? (
                          <span className="text-green-600 font-medium flex items-center justify-end gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Tamamlandı
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/customers/${customer.id}`);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Görüntüle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(customer);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(customer);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}