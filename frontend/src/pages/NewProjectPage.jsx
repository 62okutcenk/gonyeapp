import { useState, useEffect, useRef } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Search,
  Check,
  UserPlus,
  Building2,
  HardHat,
  Briefcase,
  Phone,
} from "lucide-react";
import { getCities, getDistricts } from "@/data/turkeyData";
import { formatCurrency, formatPhoneNumber } from "@/utils/formatters";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const customerTypes = [
  { value: "bireysel", label: "Bireysel", icon: User },
  { value: "mimar", label: "Mimar", icon: Building2 },
  { value: "muteahhit", label: "Müteahhit", icon: HardHat },
  { value: "kurumsal", label: "Kurumsal", icon: Briefcase },
];

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workItems, setWorkItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [expandedArea, setExpandedArea] = useState(0);

  // Customer state
  const [customers, setCustomers] = useState([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    type: "bireysel",
    name: "",
    phone: "",
    email: "",
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    customer_id: "",
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
    fetchCustomers();
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

  const fetchCustomers = async (search = "") => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const response = await axios.get(`${API_URL}/customers${params}`);
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone || "",
      customer_email: customer.email || "",
    }));
    setCustomerSearchOpen(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setFormData((prev) => ({
      ...prev,
      customer_id: "",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
    }));
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      toast.error("İsim ve telefon zorunludur");
      return;
    }

    setSavingCustomer(true);
    try {
      const response = await axios.post(`${API_URL}/customers`, newCustomerForm);
      const newCustomer = response.data;
      
      // Select the new customer
      handleSelectCustomer(newCustomer);
      
      // Refresh customers list
      fetchCustomers();
      
      // Close dialog and reset form
      setNewCustomerDialogOpen(false);
      setNewCustomerForm({ type: "bireysel", name: "", phone: "", email: "" });
      
      toast.success("Müşteri oluşturuldu ve seçildi");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Müşteri oluşturulamadı");
    } finally {
      setSavingCustomer(false);
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
      toast.error("Müşteri seçimi veya müşteri adı gereklidir");
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

  // Filter customers based on search
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

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

        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Müşteri Seçimi
            </CardTitle>
            <CardDescription>
              Mevcut müşterilerden seçin veya yeni müşteri ekleyin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomer ? (
              // Selected Customer Card
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-semibold text-primary">
                      {selectedCustomer.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.type && (
                        <Badge variant="secondary" className="text-xs">
                          {customerTypes.find(t => t.value === selectedCustomer.type)?.label || selectedCustomer.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearCustomer}>
                  Değiştir
                </Button>
              </div>
            ) : (
              // Customer Search / Add
              <div className="flex gap-2">
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerSearchOpen}
                      className="flex-1 justify-between"
                    >
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Search className="h-4 w-4" />
                        Müşteri ara veya seç...
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="İsim veya telefon ile ara..." 
                        value={customerSearch}
                        onValueChange={setCustomerSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-6 text-center">
                            <p className="text-sm text-muted-foreground mb-3">Müşteri bulunamadı</p>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setNewCustomerForm(prev => ({ ...prev, name: customerSearch }));
                                setNewCustomerDialogOpen(true);
                                setCustomerSearchOpen(false);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Yeni Müşteri Oluştur
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup heading="Müşteriler">
                          {filteredCustomers.slice(0, 10).map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => handleSelectCustomer(customer)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <span className="text-xs font-medium">
                                    {customer.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{customer.name}</p>
                                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                </div>
                              </div>
                              <Check className={cn(
                                "ml-auto h-4 w-4",
                                selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                              )} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setNewCustomerDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Yeni
                </Button>
              </div>
            )}

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due_date">Termin Tarihi</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleFormChange("due_date", e.target.value)}
              />
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
                      <Badge variant="outline" className="text-green-600">
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
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeArea(areaIndex);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
                    {/* Area Name & Address */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Alan Adı *</Label>
                        <Input
                          value={area.name}
                          onChange={(e) => updateArea(areaIndex, "name", e.target.value)}
                          placeholder="Örn: Mutfak, Gardrop"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Adres</Label>
                        <Input
                          value={area.address}
                          onChange={(e) => updateArea(areaIndex, "address", e.target.value)}
                          placeholder="Açık adres (opsiyonel)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>İl</Label>
                        <Select
                          value={area.city}
                          onValueChange={(v) => updateArea(areaIndex, "city", v)}
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
                          onValueChange={(v) => updateArea(areaIndex, "district", v)}
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
                    </div>

                    {/* Work Items Selection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        İş Kalemleri *
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {workItems.map((item) => {
                          const isSelected = area.work_items.some(
                            (wi) => wi.work_item_id === item.id
                          );
                          return (
                            <Badge
                              key={item.id}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer transition-colors",
                                isSelected && "bg-primary"
                              )}
                              onClick={() => toggleWorkItem(areaIndex, item.id, item.name)}
                            >
                              {item.name}
                            </Badge>
                          );
                        })}
                      </div>
                      {workItems.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Henüz iş kalemi tanımlanmamış.{" "}
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate("/setup/workitems")}
                          >
                            İş Kalemleri sayfasından ekleyin
                          </Button>
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Anlaşma Bedeli
                      </Label>
                      <Input
                        type="number"
                        value={area.agreed_price || ""}
                        onChange={(e) =>
                          updateArea(areaIndex, "agreed_price", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                    </div>

                    {/* Area Assignments */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Alan Personeli
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {assignments
                          .filter((a) => a.assignment_type === "area" && a.areaIndex === areaIndex)
                          .map((assignment, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="gap-1 pr-1"
                            >
                              {assignment.user_name}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-1 hover:bg-transparent"
                                onClick={() =>
                                  removeAssignment(
                                    assignments.findIndex(
                                      (a) =>
                                        a.user_id === assignment.user_id &&
                                        a.assignment_type === "area" &&
                                        a.areaIndex === areaIndex
                                    )
                                  )
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                      </div>
                      <Select
                        value=""
                        onValueChange={(userId) => addAssignment(userId, "area", areaIndex)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Personel ekle..." />
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
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Project-level Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Proje Ekibi
            </CardTitle>
            <CardDescription>
              Tüm alanlarda çalışacak personeli atayın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {assignments
                .filter((a) => a.assignment_type === "project")
                .map((assignment, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                    {assignment.user_name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-transparent"
                      onClick={() =>
                        removeAssignment(
                          assignments.findIndex(
                            (a) =>
                              a.user_id === assignment.user_id &&
                              a.assignment_type === "project"
                          )
                        )
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
            </div>
            <Select
              value=""
              onValueChange={(userId) => addAssignment(userId, "project")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Personel ekle..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Anlaşma Bedeli</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(totalAgreed)}
                </p>
              </div>
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Proje Oluştur
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* New Customer Dialog */}
      <Dialog open={newCustomerDialogOpen} onOpenChange={setNewCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Hızlı Müşteri Ekleme</DialogTitle>
            <DialogDescription>
              Yeni müşteri bilgilerini girin
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-customer-type">Müşteri Tipi</Label>
              <Select
                value={newCustomerForm.type}
                onValueChange={(v) => setNewCustomerForm(prev => ({ ...prev, type: v }))}
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
              <Label htmlFor="new-customer-name">İsim / Firma Adı *</Label>
              <Input
                id="new-customer-name"
                value={newCustomerForm.name}
                onChange={(e) => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ahmet Yılmaz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-phone">Telefon *</Label>
              <Input
                id="new-customer-phone"
                value={newCustomerForm.phone}
                onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="0 (5xx) xxx xx xx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-email">E-posta</Label>
              <Input
                id="new-customer-email"
                type="email"
                value={newCustomerForm.email}
                onChange={(e) => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="ornek@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleCreateNewCustomer} disabled={savingCustomer}>
              {savingCustomer && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Oluştur ve Seç
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
