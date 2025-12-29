import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import axios from "axios";
import { Loader2, Upload, Trash2, User, Mail, Shield } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Form states
  const [fullName, setFullName] = useState(user?.full_name || "");

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API_URL}/users/${user.id}`, {
        full_name: fullName,
      });
      await refreshUser();
      toast.success("Profil bilgileri güncellendi");
    } catch (error) {
      toast.error("Güncelleme başarısız oldu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen geçerli bir resim dosyası seçin");
      return;
    }

    // Maksimum 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'dan küçük olmalıdır");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_URL}/users/me/avatar`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      await refreshUser();
      toast.success("Profil fotoğrafı güncellendi");
    } catch (error) {
      toast.error("Fotoğraf yüklenirken bir hata oluştu");
      console.error(error);
    } finally {
      setUploading(false);
      // Input değerini sıfırla ki aynı dosyayı tekrar seçebilsin
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm("Profil fotoğrafınızı silmek istediğinize emin misiniz?")) return;
    
    setUploading(true);
    try {
      await axios.delete(`${API_URL}/users/me/avatar`);
      await refreshUser();
      toast.success("Profil fotoğrafı kaldırıldı");
    } catch (error) {
      toast.error("İşlem başarısız oldu");
    } finally {
      setUploading(false);
    }
  };

  const fullAvatarUrl = user?.avatar_url 
    ? (user.avatar_url.startsWith("http") ? user.avatar_url : process.env.REACT_APP_BACKEND_URL + user.avatar_url)
    : null;

  return (
    <div className="container mx-auto max-w-4xl py-6 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profil Ayarları</h2>
        <p className="text-muted-foreground">
          Kişisel bilgilerinizi ve profil fotoğrafınızı buradan yönetebilirsiniz.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
        
        {/* Sol Kolon - Avatar */}
        <Card>
          <CardHeader>
            <CardTitle>Profil Fotoğrafı</CardTitle>
            <CardDescription>
              Diğer kullanıcıların sizi tanıması için bir fotoğraf yükleyin.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="relative group">
              <Avatar className="h-40 w-40 border-4 border-background shadow-xl cursor-pointer" onClick={handleAvatarClick}>
                <AvatarImage src={fullAvatarUrl} className="object-cover" />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                  {getInitials(user?.full_name)}
                </AvatarFallback>
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Upload className="h-8 w-8 text-white" />
                </div>
              </Avatar>
              
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAvatarClick} disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                Fotoğraf Değiştir
              </Button>
              {user?.avatar_url && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleRemoveAvatar} disabled={uploading}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sağ Kolon - Bilgiler */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kişisel Bilgiler</CardTitle>
              <CardDescription>
                Sistemdeki görünen adınız ve iletişim bilgileriniz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta Adresi</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      value={user?.email} 
                      disabled 
                      className="pl-9 bg-muted/50" 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">E-posta adresi değiştirilemez.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Ad Soyad</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9"
                      placeholder="Adınız ve Soyadınız"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Rol</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50">
                       {user?.is_admin ? "Yönetici" : "Kullanıcı"}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Değişiklikleri Kaydet
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}