import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Package, Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    tenantName: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır");
      return;
    }

    setLoading(true);

    try {
      await register(
        formData.email,
        formData.password,
        formData.fullName,
        formData.tenantName
      );
      toast.success("Firma başarıyla oluşturuldu!");
      navigate("/dashboard");
    } catch (error) {
      const message = error.response?.data?.detail || "Kayıt başarısız. Lütfen tekrar deneyin.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1760237655540-8197ef24838b?crop=entropy&cs=srgb&fm=jpg&q=85')"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/20" />
        </div>
        <div className="relative z-10 flex flex-col justify-end p-12 text-foreground">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Package className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="font-bold text-2xl tracking-tight">CraftForge</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Firmanızı<br />Kaydedin
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Hemen başlayın. Varsayılan gruplar, alt görevler ve roller otomatik oluşturulacak.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="space-y-1 text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:hidden mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">CraftForge</span>
            </div>
            <CardTitle className="text-2xl font-bold">Firma Oluştur</CardTitle>
            <CardDescription>
              Yeni bir firma hesabı oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Firma Adı</Label>
                <Input
                  id="tenantName"
                  name="tenantName"
                  placeholder="Örn: Yılmaz Mobilya"
                  value={formData.tenantName}
                  onChange={handleChange}
                  required
                  data-testid="register-tenant-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Adınız Soyadınız</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  data-testid="register-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ornek@firma.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="register-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="En az 6 karakter"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    data-testid="register-password-input"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Şifrenizi tekrar girin"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  data-testid="register-confirm-password-input"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="register-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  "Firma Oluştur"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Zaten hesabınız var mı? </span>
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
                data-testid="login-link"
              >
                Giriş Yap
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
