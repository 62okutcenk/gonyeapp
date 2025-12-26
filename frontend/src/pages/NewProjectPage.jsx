import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  ArrowLeft,
  Package,
  Calendar as CalendarIcon,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workItemsLoading, setWorkItemsLoading] = useState(true);
  const [workItems, setWorkItems] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    due_date: null,
  });
  const [selectedWorkItems, setSelectedWorkItems] = useState({});

  useEffect(() => {
    fetchWorkItems();
  }, []);

  const fetchWorkItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/workitems`);
      setWorkItems(response.data);
    } catch (error) {
      console.error("Failed to fetch work items:", error);
      toast.error("İş kalemleri yüklenirken hata oluştu");
    } finally {
      setWorkItemsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleWorkItemToggle = (workItemId) => {
    setSelectedWorkItems((prev) => {
      if (prev[workItemId]) {
        const { [workItemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [workItemId]: { quantity: 1, notes: "" } };
    });
  };

  const handleWorkItemQuantity = (workItemId, delta) => {
    setSelectedWorkItems((prev) => ({
      ...prev,
      [workItemId]: {
        ...prev[workItemId],
        quantity: Math.max(1, (prev[workItemId]?.quantity || 1) + delta),
      },
    }));
  };

  const handleWorkItemNotes = (workItemId, notes) => {
    setSelectedWorkItems((prev) => ({
      ...prev,
      [workItemId]: {
        ...prev[workItemId],
        notes,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Proje adı gereklidir");
      return;
    }

    if (Object.keys(selectedWorkItems).length === 0) {
      toast.error("En az bir iş kalemi seçmelisiniz");
      return;
    }

    setLoading(true);

    try {
      const workItemsData = Object.entries(selectedWorkItems).map(([id, data]) => ({
        work_item_id: id,
        quantity: data.quantity,
        notes: data.notes || null,
      }));

      const response = await axios.post(`${API_URL}/projects`, {
        ...formData,
        due_date: formData.due_date?.toISOString() || null,
        work_items: workItemsData,
      });

      toast.success("Proje başarıyla oluşturuldu");
      navigate(`/projects/${response.data.id}`);
    } catch (error) {
      const message = error.response?.data?.detail || "Proje oluşturulurken hata oluştu";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in" data-testid="new-project-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yeni Proje</h1>
          <p className="text-muted-foreground">
            Yeni bir proje oluşturun ve iş kalemlerini seçin
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Proje Bilgileri</CardTitle>
              <CardDescription>
                Projenin temel bilgilerini girin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Proje Adı *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Örn: Yılmaz Evi Mutfak Projesi"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  data-testid="project-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Proje hakkında detaylı bilgi..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  data-testid="project-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Teslim Tarihi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.due_date && "text-muted-foreground"
                      )}
                      data-testid="due-date-button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date
                        ? format(formData.due_date, "d MMMM yyyy", { locale: tr })
                        : "Tarih seçin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.due_date}
                      onSelect={(date) =>
                        setFormData((prev) => ({ ...prev, due_date: date }))
                      }
                      locale={tr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Müşteri Bilgileri</CardTitle>
              <CardDescription>
                Müşteri iletişim bilgilerini girin (opsiyonel)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Müşteri Adı</Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={formData.customer_name}
                  onChange={handleChange}
                  data-testid="customer-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Telefon</Label>
                <Input
                  id="customer_phone"
                  name="customer_phone"
                  placeholder="Örn: 0532 123 45 67"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  data-testid="customer-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_address">Adres</Label>
                <Textarea
                  id="customer_address"
                  name="customer_address"
                  placeholder="Teslimat adresi..."
                  value={formData.customer_address}
                  onChange={handleChange}
                  rows={3}
                  data-testid="customer-address-input"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Work Items Selection */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>İş Kalemleri *</CardTitle>
            <CardDescription>
              Projede yapılacak iş kalemlerini seçin. Seçilen her iş kalemi için otomatik olarak görevler oluşturulacaktır.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workItemsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : workItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Henüz iş kalemi tanımlanmamış
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/setup/workitems")}
                >
                  İş Kalemi Ekle
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {workItems.map((item) => {
                  const isSelected = !!selectedWorkItems[item.id];
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "relative rounded-lg border p-4 transition-all cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => handleWorkItemToggle(item.id)}
                      data-testid={`work-item-${item.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleWorkItemToggle(item.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary shrink-0" />
                            <p className="font-medium truncate">{item.name}</p>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div
                          className="mt-4 pt-4 border-t space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Adet:</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleWorkItemQuantity(item.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {selectedWorkItems[item.id]?.quantity || 1}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleWorkItemQuantity(item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Input
                              placeholder="Not ekle..."
                              className="h-8 text-xs"
                              value={selectedWorkItems[item.id]?.notes || ""}
                              onChange={(e) => handleWorkItemNotes(item.id, e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={loading || Object.keys(selectedWorkItems).length === 0}
            data-testid="create-project-button"
          >
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
      </form>
    </div>
  );
}
