import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building2, Upload, Loader2, ImageIcon, Sun, Moon } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SetupSettingsPage() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    light_logo_url: "",
    dark_logo_url: "",
  });

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    try {
      const response = await axios.get(`${API_URL}/tenant`);
      setTenant(response.data);
      setForm({
        name: response.data.name,
        light_logo_url: response.data.light_logo_url || "",
        dark_logo_url: response.data.dark_logo_url || "",
      });
    } catch (error) {
      console.error("Failed to fetch tenant:", error);
      toast.error("Firma bilgileri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`${API_URL}/tenant`, {
        name: form.name,
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

  const handleLogoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  data-testid="tenant-name-input"
                />
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
                <div className="flex items-center gap-4">
                  <div className="h-20 w-40 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                    {form.light_logo_url ? (
                      <img
                        src={form.light_logo_url}
                        alt="Light Logo"
                        className="max-h-16 max-w-36 object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div>
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
                  </div>
                </div>
                <Input
                  placeholder="veya URL girin..."
                  value={form.light_logo_url}
                  onChange={(e) => setForm((p) => ({ ...p, light_logo_url: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <Separator />

              {/* Dark Mode Logo */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Koyu Tema Logosu
                </Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-40 rounded-lg border bg-slate-900 flex items-center justify-center overflow-hidden">
                    {form.dark_logo_url ? (
                      <img
                        src={form.dark_logo_url}
                        alt="Dark Logo"
                        className="max-h-16 max-w-36 object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-700" />
                    )}
                  </div>
                  <div>
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
                  </div>
                </div>
                <Input
                  placeholder="veya URL girin..."
                  value={form.dark_logo_url}
                  onChange={(e) => setForm((p) => ({ ...p, dark_logo_url: e.target.value }))}
                  className="text-sm"
                />
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
