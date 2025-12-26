import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2,
  Package,
  Shield,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Upload,
  ImageIcon,
  Sun,
  Moon,
  MapPin,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { getCities, getDistricts, getTaxOffices } from "@/data/turkeyData";
import { formatPhoneNumber, formatTaxNumber } from "@/utils/formatters";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const steps = [
  { id: 1, title: "Firma Bilgileri", icon: Building2 },
  { id: 2, title: "Logo Ayarları", icon: ImageIcon },
  { id: 3, title: "İş Kalemleri", icon: Package },
  { id: 4, title: "Tamamlandı", icon: CheckCircle2 },
];

export default function SetupWizardPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 1: Company Info
  const [companyForm, setCompanyForm] = useState({
    name: "",
    city: "",
    district: "",
    address: "",
    contact_email: "",
    phone: "",
    tax_office: "",
    tax_number: "",
  });

  // Step 2: Logos
  const [logos, setLogos] = useState({
    light_logo_url: "",
    dark_logo_url: "",
  });
  const [logoPreview, setLogoPreview] = useState({
    light: null,
    dark: null,
  });

  // Step 3: Work Items
  const [workItems, setWorkItems] = useState([]);
  const [newWorkItem, setNewWorkItem] = useState({ name: "", description: "" });

  // Fetch existing data
  useEffect(() => {
    fetchTenantData();
    fetchWorkItems();
  }, []);

  const fetchTenantData = async () => {
    try {
      const response = await axios.get(`${API_URL}/tenant`);
      const tenant = response.data;
      setCompanyForm({
        name: tenant.name || "",
        city: tenant.city || "",
        district: tenant.district || "",
        address: tenant.address || "",
        contact_email: tenant.contact_email || "",
        phone: tenant.phone || "",
        tax_office: tenant.tax_office || "",
        tax_number: tenant.tax_number || "",
      });
      setLogos({
        light_logo_url: tenant.light_logo_url || "",
        dark_logo_url: tenant.dark_logo_url || "",
      });
      if (tenant.light_logo_url) {
        setLogoPreview((prev) => ({ ...prev, light: tenant.light_logo_url }));
      }
      if (tenant.dark_logo_url) {
        setLogoPreview((prev) => ({ ...prev, dark: tenant.dark_logo_url }));
      }
    } catch (error) {
      console.error("Failed to fetch tenant:", error);
    }
  };

  const fetchWorkItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/workitems`);
      setWorkItems(response.data);
    } catch (error) {
      console.error("Failed to fetch work items:", error);
    }
  };

  const handleCompanyChange = (field, value) => {
    setCompanyForm((prev) => {
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
    setCompanyForm((prev) => ({ ...prev, phone: formatted }));
  };

  const handleTaxNumberChange = (value) => {
    const formatted = formatTaxNumber(value);
    setCompanyForm((prev) => ({ ...prev, tax_number: formatted }));
  };

  const handleLogoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview((prev) => ({
        ...prev,
        [type]: e.target.result,
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
      setLogos((prev) => ({
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

  const handleAddWorkItem = async (itemName = null) => {
    const nameToAdd = itemName || newWorkItem.name;
    
    if (!nameToAdd.trim()) {
      toast.error("İş kalemi adı gereklidir");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/workitems`, { 
        name: nameToAdd, 
        description: "" 
      });
      setWorkItems((prev) => [...prev, response.data]);
      setNewWorkItem({ name: "", description: "" });
      toast.success("İş kalemi eklendi");
    } catch (error) {
      toast.error("İş kalemi eklenirken hata oluştu");
    }
  };

  const handleRemoveWorkItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/workitems/${id}`);
      setWorkItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("İş kalemi silindi");
    } catch (error) {
      toast.error("İş kalemi silinirken hata oluştu");
    }
  };

  const saveCurrentStep = async () => {
    setSaving(true);
    try {
      if (currentStep === 1) {
        await axios.put(`${API_URL}/tenant`, companyForm);
      } else if (currentStep === 2) {
        await axios.put(`${API_URL}/tenant`, logos);
      }
      return true;
    } catch (error) {
      toast.error("Kaydetme sırasında hata oluştu");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const success = await saveCurrentStep();
    if (success && currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    await saveCurrentStep();
    
    // Mark setup as complete
    try {
      await axios.put(`${API_URL}/tenant`, { setup_completed: true });
      await refreshUser(); // Refresh user to update setup_completed status
      toast.success("Kurulum tamamlandı!");
      navigate("/dashboard");
    } catch (error) {
      navigate("/dashboard");
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background" data-testid="setup-wizard-page">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-4xl mx-auto py-6 px-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Package className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CraftForge Kurulum Sihirbazı</h1>
              <p className="text-muted-foreground">Firmanızı adım adım yapılandırın</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="border-b bg-muted/30">
        <div className="container max-w-4xl mx-auto py-4 px-4">
          <div className="flex items-center justify-between mb-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 ${
                  step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                {index < steps.length - 1 && (
                  <div className="w-8 sm:w-16 h-0.5 bg-muted mx-2" />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Step 1: Company Info */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Firma Bilgileri
              </CardTitle>
              <CardDescription>
                Firmanızın temel bilgilerini girin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Firma Adı *</Label>
                  <Input
                    id="name"
                    value={companyForm.name}
                    onChange={(e) => handleCompanyChange("name", e.target.value)}
                    placeholder="Örn: Yılmaz Mobilya"
                    data-testid="company-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">İl *</Label>
                  <Select
                    value={companyForm.city}
                    onValueChange={(value) => handleCompanyChange("city", value)}
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
                  <Label htmlFor="district">İlçe *</Label>
                  <Select
                    value={companyForm.district}
                    onValueChange={(value) => handleCompanyChange("district", value)}
                    disabled={!companyForm.city}
                  >
                    <SelectTrigger data-testid="district-select">
                      <SelectValue placeholder="İlçe seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {getDistricts(companyForm.city).map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Açık Adres
                  </Label>
                  <Textarea
                    id="address"
                    value={companyForm.address}
                    onChange={(e) => handleCompanyChange("address", e.target.value)}
                    placeholder="Mahalle, Sokak, Bina No..."
                    rows={2}
                    data-testid="address-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">
                    <Mail className="h-4 w-4 inline mr-1" />
                    İletişim E-postası
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={companyForm.contact_email}
                    onChange={(e) => handleCompanyChange("contact_email", e.target.value)}
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
                    value={companyForm.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0 (xxx) xxx xx xx"
                    data-testid="phone-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_office">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Vergi Dairesi
                  </Label>
                  <Select
                    value={companyForm.tax_office}
                    onValueChange={(value) => handleCompanyChange("tax_office", value)}
                    disabled={!companyForm.city}
                  >
                    <SelectTrigger data-testid="tax-office-select">
                      <SelectValue placeholder="Vergi dairesi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTaxOffices(companyForm.city).map((office) => (
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
                    value={companyForm.tax_number}
                    onChange={(e) => handleTaxNumberChange(e.target.value)}
                    placeholder="10 veya 11 haneli"
                    maxLength={11}
                    data-testid="tax-number-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Logo Settings */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo Ayarları
              </CardTitle>
              <CardDescription>
                Açık ve koyu tema için logolarınızı yükleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Light Mode Logo */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-base">
                  <Sun className="h-5 w-5" />
                  Açık Tema Logosu
                </Label>
                <div className="flex items-start gap-6">
                  <div className="h-32 w-64 rounded-xl border-2 border-dashed bg-white flex items-center justify-center overflow-hidden">
                    {logoPreview.light ? (
                      <img
                        src={logoPreview.light}
                        alt="Light Logo Preview"
                        className="max-h-28 max-w-60 object-contain"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Logo yüklenmedi</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <input
                      type="file"
                      id="light-logo"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, "light")}
                    />
                    <Button type="button" variant="outline" asChild>
                      <label htmlFor="light-logo" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Logo Yükle
                      </label>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG veya SVG. Önerilen: 200x60px
                    </p>
                  </div>
                </div>
              </div>

              {/* Dark Mode Logo */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-base">
                  <Moon className="h-5 w-5" />
                  Koyu Tema Logosu
                </Label>
                <div className="flex items-start gap-6">
                  <div className="h-32 w-64 rounded-xl border-2 border-dashed bg-slate-900 flex items-center justify-center overflow-hidden">
                    {logoPreview.dark ? (
                      <img
                        src={logoPreview.dark}
                        alt="Dark Logo Preview"
                        className="max-h-28 max-w-60 object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-500">
                        <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Logo yüklenmedi</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <input
                      type="file"
                      id="dark-logo"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, "dark")}
                    />
                    <Button type="button" variant="outline" asChild>
                      <label htmlFor="dark-logo" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Logo Yükle
                      </label>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Koyu arka plan için açık renkli logo önerilir
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Work Items */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                İş Kalemleri
              </CardTitle>
              <CardDescription>
                Ürettiğiniz ürün türlerini tanımlayın (kapı, dolap, vestiyer vb.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Work Item */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="İş kalemi adı (Örn: Mutfak Dolabı)"
                    value={newWorkItem.name}
                    onChange={(e) => setNewWorkItem((prev) => ({ ...prev, name: e.target.value }))}
                    data-testid="new-workitem-name"
                  />
                </div>
                <Button onClick={handleAddWorkItem} data-testid="add-workitem-button">
                  Ekle
                </Button>
              </div>

              {/* Work Items List */}
              <div className="space-y-2">
                {workItems.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg bg-muted/30">
                    <Package className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                    <p className="mt-4 text-muted-foreground">
                      Henüz iş kalemi eklenmedi
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Yukarıdaki alandan yeni iş kalemleri ekleyebilirsiniz
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {workItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveWorkItem(item.id)}
                        >
                          Kaldır
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggestions */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">Önerilen iş kalemleri:</p>
                <div className="flex flex-wrap gap-2">
                  {["Mutfak Dolabı", "Vestiyer", "Kapı", "Gardrop", "Banyo Dolabı", "TV Ünitesi", "Yatak Odası Takımı", "Ofis Mobilyası"]
                    .filter((name) => !workItems.some((item) => item.name === name))
                    .map((name) => (
                      <Button
                        key={name}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddWorkItem(name)}
                        data-testid={`quick-add-${name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        + {name}
                      </Button>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {currentStep === 4 && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Kurulum Tamamlandı!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Firmanız başarıyla yapılandırıldı. Artık projelerinizi oluşturmaya ve yönetmeye başlayabilirsiniz.
              </p>
              
              <div className="mt-8 p-6 rounded-lg bg-muted/50 max-w-md mx-auto text-left">
                <h3 className="font-semibold mb-3">Özet:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Firma bilgileri kaydedildi
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {logoPreview.light || logoPreview.dark ? "Logo(lar) yüklendi" : "Logo ayarları atlandı"}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {workItems.length} iş kalemi oluşturuldu
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Varsayılan gruplar ve alt görevler hazır
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1 || saving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri
          </Button>

          {currentStep < steps.length ? (
            <Button onClick={handleNext} disabled={saving} data-testid="next-button">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  İleri
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleFinish} data-testid="finish-button">
              Başla
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
