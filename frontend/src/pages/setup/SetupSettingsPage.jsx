import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Upload, Loader2, ImageIcon, Sun, Moon, MapPin, Phone, Mail, FileText } from "lucide-react";
import { getCities, getDistricts, getTaxOffices } from "@/data/turkeyData";
import { formatPhoneNumber, formatTaxNumber } from "@/utils/formatters";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SetupSettingsPage() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    district: "",
    address: "",
    contact_email: "",
    phone: "",
    tax_office: "",
    tax_number: "",
    light_logo_url: "",
    dark_logo_url: "",
  });
  const [logoPreview, setLogoPreview] = useState({
    light: null,
    dark: null,
  });

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    try {
      const response = await axios.get(`${API_URL}/tenant`);
      const data = response.data;
      setTenant(data);
      setForm({
        name: data.name || "",
        city: data.city || "",
        district: data.district || "",
        address: data.address || "",
        contact_email: data.contact_email || "",
        phone: data.phone || "",
        tax_office: data.tax_office || "",
        tax_number: data.tax_number || "",
        light_logo_url: data.light_logo_url || "",
        dark_logo_url: data.dark_logo_url || "",
      });
      if (data.light_logo_url) {
        setLogoPreview((prev) => ({ ...prev, light: data.light_logo_url }));
      }
      if (data.dark_logo_url) {
        setLogoPreview((prev) => ({ ...prev, dark: data.dark_logo_url }));
      }
    } catch (error) {
      console.error("Failed to fetch tenant:", error);
      toast.error("Firma bilgileri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === "city") {
        updated.district = "";
        updated.tax_office = "";
      }
      
      return updated;
    });
  };

  const handlePhoneChange = (value) => {
    const formatted = formatPhoneNumber(value);
    setForm((prev) => ({ ...prev, phone: formatted }));
  };

  const handleTaxNumberChange = (value) => {
    const formatted = formatTaxNumber(value);
    setForm((prev) => ({ ...prev, tax_number: formatted }));
  };

  const handleLogoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview((prev) => ({
        ...prev,
        [type]: event.target.result,
      }));
    };
    reader.readAsDataURL(file);

    // Upload file
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_URL}/files/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const logoUrl = `${API_URL}/files/${response.data.id}`;
      setForm((prev) => ({
        ...prev,
        [type === "light" ? "light_logo_url" : "dark_logo_url"]: logoUrl,
      }));
      toast.success("Logo yüklendi");
    } catch (error) {
      toast.error("Logo yüklenirken hata oluştu");
      setLogoPreview((prev) => ({
        ...prev,
        [type]: null,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`${API_URL}/tenant`, {
        name: form.name,
        city: form.city || null,
        district: form.district || null,
        address: form.address || null,
        contact_email: form.contact_email || null,
        phone: form.phone || null,
        tax_office: form.tax_office || null,
        tax_number: form.tax_number || null,
        light_logo_url: form.light_logo_url || null,
        dark_logo_url: form.dark_logo_url || null,
      });
      toast.success("Firma ayarları güncellendi");
      fetchTenant();
    } catch (error) {
      toast.error("Ayarlar güncellenirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in" data-testid="setup-settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Firma Ayarları</h1>
        <p className="text-muted-foreground">
          Firma bilgilerini ve logolarını yönetin
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Firma Bilgileri
              </CardTitle>
              <CardDescription>
                Temel firma bilgilerini düzenleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Firma Adı *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  data-testid="tenant-name-input"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">İl</Label>
                  <Select
                    value={form.city}
                    onValueChange={(value) => handleChange("city", value)}
                  >
                    <SelectTrigger data-testid="city-select">
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
                  <Label htmlFor="district">İlçe</Label>
                  <Select
                    value={form.district}
                    onValueChange={(value) => handleChange("district", value)}
                    disabled={!form.city}
                  >
                    <SelectTrigger data-testid="district-select">
                      <SelectValue placeholder="İlçe seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {getDistricts(form.city).map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Açık Adres
                </Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Mahalle, Sokak, Bina No..."
                  rows={2}
                  data-testid="address-input"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">
                    <Mail className="h-4 w-4 inline mr-1" />
                    İletişim E-postası
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => handleChange("contact_email", e.target.value)}
                    placeholder="iletisim@firma.com"
                    data-testid="contact-email-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Telefon
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0 (xxx) xxx xx xx"
                    data-testid="phone-input"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tax_office">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Vergi Dairesi
                  </Label>
                  <Select
                    value={form.tax_office}
                    onValueChange={(value) => handleChange("tax_office", value)}
                    disabled={!form.city}
                  >
                    <SelectTrigger data-testid="tax-office-select">
                      <SelectValue placeholder="Vergi dairesi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTaxOffices(form.city).map((office) => (
                        <SelectItem key={office} value={office}>
                          {office}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_number">Vergi Numarası</Label>
                  <Input
                    id="tax_number"
                    value={form.tax_number}
                    onChange={(e) => handleTaxNumberChange(e.target.value)}
                    placeholder="10 veya 11 haneli"
                    maxLength={11}
                    data-testid="tax-number-input"
                  />
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Oluşturulma:</strong>{" "}
                  {new Date(tenant?.created_at).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Logos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo Ayarları
              </CardTitle>
              <CardDescription>
                Açık ve koyu tema için ayrı logolar yükleyebilirsiniz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Light Mode Logo */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Açık Tema Logosu
                </Label>
                <div className="flex items-start gap-4">
                  <div className="h-24 w-48 rounded-xl border-2 border-dashed bg-white flex items-center justify-center overflow-hidden">
                    {logoPreview.light ? (
                      <img
                        src={logoPreview.light}
                        alt="Light Logo"
                        className="max-h-20 max-w-44 object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      id="light-logo"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, "light")}
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <label htmlFor="light-logo" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Yükle
                      </label>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, SVG
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dark Mode Logo */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Koyu Tema Logosu
                </Label>
                <div className="flex items-start gap-4">
                  <div className="h-24 w-48 rounded-xl border-2 border-dashed bg-slate-900 flex items-center justify-center overflow-hidden">
                    {logoPreview.dark ? (
                      <img
                        src={logoPreview.dark}
                        alt="Dark Logo"
                        className="max-h-20 max-w-44 object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-700" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      id="dark-logo"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, "dark")}
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <label htmlFor="dark-logo" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Yükle
                      </label>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Koyu arka plan için
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={saving} data-testid="save-settings-button">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </form>
    </div>
  );
}
