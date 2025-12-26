import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Plus,
  Trash2,
  MapPin,
  User,
  Package,
  Wallet,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getCities, getDistricts } from "@/data/turkeyData";
import { formatCurrency, formatPhoneNumber } from "@/utils/formatters";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workItems, setWorkItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [expandedArea, setExpandedArea] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    due_date: "",
  });

  // Areas state
  const [areas, setAreas] = useState([
    {
      name: "",
      address: "",
      city: "",
      district: "",
      work_items: [],
      agreed_price: 0,
      status: "planlandi",
    },
  ]);

  // Assignments state
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    fetchWorkItems();
    fetchUsers();
  }, []);

  const fetchWorkItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/workitems`);
      setWorkItems(response.data);
    } catch (error) {
      console.error("Failed to fetch work items:", error);
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

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (value) => {
    const formatted = formatPhoneNumber(value);
    setFormData((prev) => ({ ...prev, customer_phone: formatted }));
  };

  // Area handlers
  const addArea = () => {
    setAreas((prev) => [
      ...prev,
      {
        name: "",
        address: "",
        city: "",
        district: "",
        work_items: [],
        agreed_price: 0,
        status: "planlandi",
      },
    ]);
    setExpandedArea(areas.length);
  };

  const removeArea = (index) => {
    if (areas.length <= 1) {
      toast.error("En az bir çalışma alanı gereklidir");
      return;
    }
    setAreas((prev) => prev.filter((_, i) => i !== index));
    // Remove area-specific assignments
    setAssignments((prev) => prev.filter((a) => a.areaIndex !== index));
  };

  const updateArea = (index, field, value) => {
    setAreas((prev) =>
      prev.map((area, i) => {
        if (i === index) {
          const updated = { ...area, [field]: value };
          if (field === "city") {
            updated.district = "";
          }
          return updated;
        }
        return area;
      })
    );
  };

  const toggleWorkItem = (areaIndex, workItemId, workItemName) => {
    setAreas((prev) =>
      prev.map((area, i) => {
        if (i === areaIndex) {
          const exists = area.work_items.some((wi) => wi.work_item_id === workItemId);
          if (exists) {
            return {
              ...area,
              work_items: area.work_items.filter((wi) => wi.work_item_id !== workItemId),
            };
          } else {
            return {
              ...area,
              work_items: [
                ...area.work_items,
                { work_item_id: workItemId, work_item_name: workItemName, quantity: 1 },
              ],
            };
          }
        }
        return area;
      })
    );
  };

  // Assignment handlers
  const addAssignment = (userId, type, areaIndex = null) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    // Check if already assigned
    const exists = assignments.some(
      (a) =>
        a.user_id === userId &&
        a.assignment_type === type &&
        (type === "project" || a.areaIndex === areaIndex)
    );

    if (exists) {
      toast.error("Bu personel zaten atanmış");
      return;
    }

    setAssignments((prev) => [
      ...prev,
      {
        user_id: userId,
        user_name: user.full_name,
        assignment_type: type,
        areaIndex: areaIndex,
      },
    ]);
  };

  const removeAssignment = (index) => {
    setAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Proje adı gereklidir");
      return;
    }
    if (!formData.customer_name.trim()) {
      toast.error("Müşteri adı gereklidir");
      return;
    }

    // Validate areas
    for (let i = 0; i < areas.length; i++) {
      if (!areas[i].name.trim()) {
        toast.error(`Alan ${i + 1} için isim gereklidir`);
        return;
      }
      if (areas[i].work_items.length === 0) {
        toast.error(`"${areas[i].name}" alanı için en az bir iş kalemi seçmelisiniz`);
        return;
      }
    }

    setLoading(true);

    try {
      // Prepare assignments with area_id placeholder (will be filled after area creation)
      const projectAssignments = assignments.map((a) => ({
        user_id: a.user_id,
        assignment_type: a.assignment_type,
        area_id: null, // Will be handled by backend or in a second request
        _areaIndex: a.areaIndex, // For mapping
      }));

      const payload = {
        ...formData,
        areas: areas,
        assigned_users: projectAssignments.filter((a) => a.assignment_type === "project"),
      };

      const response = await axios.post(`${API_URL}/projects`, payload);
      const project = response.data;

      // Assign area-specific users
      const areaAssignments = assignments.filter((a) => a.assignment_type === "area");
      for (const assignment of areaAssignments) {
        if (assignment.areaIndex !== null && project.areas[assignment.areaIndex]) {
          try {
            await axios.post(`${API_URL}/projects/${project.id}/assignments`, {
              user_id: assignment.user_id,
              assignment_type: "area",
              area_id: project.areas[assignment.areaIndex].id,
            });
          } catch (error) {
            console.error("Failed to assign user to area:", error);
          }
        }
      }

      toast.success("Proje başarıyla oluşturuldu");
      navigate(`/projects/${project.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error(error.response?.data?.detail || "Proje oluşturulurken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const totalAgreed = areas.reduce((sum, area) => sum + (parseFloat(area.agreed_price) || 0), 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yeni Proje</h1>
          <p className="text-muted-foreground">Proje ve çalışma alanlarını tanımlayın</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Proje Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Proje Adı *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="Örn: Ahmet Bey Mutfak & Gardrop"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  placeholder="Proje hakkında notlar..."
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Müşteri Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Müşteri Adı *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleFormChange("customer_name", e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Telefon</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="0 (xxx) xxx xx xx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_email">E-posta</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleFormChange("customer_email", e.target.value)}
                  placeholder="musteri@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Termin Tarihi</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleFormChange("due_date", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Areas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Çalışma Alanları
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addArea}>
                <Plus className="mr-2 h-4 w-4" />
                Alan Ekle
              </Button>
            </div>
            <CardDescription>
              Farklı adres veya iş türleri için ayrı alanlar oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {areas.map((area, areaIndex) => (
              <div
                key={areaIndex}
                className="border rounded-lg overflow-hidden"
              >
                {/* Area Header */}
                <div
                  className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer"
                  onClick={() => setExpandedArea(expandedArea === areaIndex ? -1 : areaIndex)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {area.name || `Alan ${areaIndex + 1}`}
                    </span>
                    {area.work_items.length > 0 && (
                      <Badge variant="secondary">
                        {area.work_items.length} iş kalemi
                      </Badge>
                    )}
                    {area.agreed_price > 0 && (
                      <Badge variant="outline">
                        {formatCurrency(area.agreed_price)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {areas.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeArea(areaIndex);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    {expandedArea === areaIndex ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Area Content */}
                {expandedArea === areaIndex && (
                  <div className="p-4 space-y-4 border-t">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Alan Adı *</Label>
                        <Input
                          value={area.name}
                          onChange={(e) => updateArea(areaIndex, "name", e.target.value)}
                          placeholder="Örn: Mutfak, Gardrop, Yatak Odası"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Anlaşma Bedeli (₺)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={area.agreed_price || ""}
                          onChange={(e) => updateArea(areaIndex, "agreed_price", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>İl</Label>
                        <Select
                          value={area.city}
                          onValueChange={(value) => updateArea(areaIndex, "city", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="İl seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCities().map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>İlçe</Label>
                        <Select
                          value={area.district}
                          onValueChange={(value) => updateArea(areaIndex, "district", value)}
                          disabled={!area.city}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="İlçe seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {getDistricts(area.city).map((district) => (
                              <SelectItem key={district} value={district}>
                                {district}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Açık Adres</Label>
                        <Textarea
                          value={area.address}
                          onChange={(e) => updateArea(areaIndex, "address", e.target.value)}
                          placeholder="Mahalle, Sokak, Bina No..."
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Work Items */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        İş Kalemleri
                      </Label>
                      {workItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Henüz iş kalemi tanımlanmamış. Kurulum bölümünden ekleyebilirsiniz.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {workItems.map((item) => {
                            const isSelected = area.work_items.some(
                              (wi) => wi.work_item_id === item.id
                            );
                            const checkboxId = `wi-${areaIndex}-${item.id}`;
                            
                            // DÜZELTME BURADA YAPILDI:
                            // 1. Div'den onClick kaldırıldı.
                            // 2. Checkbox'tan pointer-events-none kaldırıldı.
                            // 3. onCheckedChange eklendi.
                            // 4. Label htmlFor eklendi.
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "flex items-center space-x-2 p-2 rounded-md border transition-colors",
                                  isSelected
                                    ? "bg-primary/10 border-primary"
                                    : "hover:bg-muted"
                                )}
                              >
                                <Checkbox 
                                  id={checkboxId}
                                  checked={isSelected} 
                                  onCheckedChange={() => toggleWorkItem(areaIndex, item.id, item.name)}
                                />
                                <Label 
                                  htmlFor={checkboxId}
                                  className="text-sm font-normal cursor-pointer flex-1"
                                >
                                  {item.name}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Total */}
            {totalAgreed > 0 && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <span className="font-medium">Toplam Anlaşma Bedeli:</span>
                <span className="text-lg font-bold">{formatCurrency(totalAgreed)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Personel Atama
            </CardTitle>
            <CardDescription>
              Projeye veya belirli alanlara personel atayın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project-level assignment */}
            <div className="space-y-2">
              <Label>Tüm Projeye Erişim</Label>
              <div className="flex gap-2">
                <Select onValueChange={(value) => addAssignment(value, "project")}>
                  <SelectTrigger className="flex-1">
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
            </div>

            {/* Area-level assignments */}
            {areas.length > 0 && areas[0].name && (
              <div className="space-y-2">
                <Label>Belirli Alana Erişim</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {areas.map((area, idx) =>
                    area.name ? (
                      <div key={idx} className="flex gap-2">
                        <Select
                          onValueChange={(value) => addAssignment(value, "area", idx)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={`${area.name} için personel`} />
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
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Assignment List */}
            {assignments.length > 0 && (
              <div className="space-y-2">
                <Label>Atanan Personeller</Label>
                <div className="flex flex-wrap gap-2">
                  {assignments.map((a, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="flex items-center gap-1 py-1.5"
                    >
                      {a.user_name}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({a.assignment_type === "project"
                          ? "Tüm Proje"
                          : areas[a.areaIndex]?.name || "Alan"})
                      </span>
                      <button
                        type="button"
                        className="ml-1 hover:text-destructive"
                        onClick={() => removeAssignment(idx)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/projects")}
          >
            İptal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              "Proje Oluştur"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}