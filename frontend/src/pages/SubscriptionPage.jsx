import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Crown,
  Zap,
  RefreshCw,
  CalendarDays,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const [subRes, planRes] = await Promise.all([
        axios.get(`${API_URL}/subscription`),
        axios.get(`${API_URL}/subscription/plan`),
      ]);
      setSubscription(subRes.data);
      setPlan(planRes.data);
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
      toast.error("Abonelik bilgileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusBadge = () => {
    if (!subscription) return null;
    
    if (subscription.is_active) {
      if (subscription.days_remaining <= 7) {
        return (
          <Badge variant="warning" className="bg-amber-100 text-amber-700 border-amber-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            {subscription.days_remaining} gün kaldı
          </Badge>
        );
      }
      return (
        <Badge variant="success" className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Aktif
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        Pasif
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Only admin can view this page
  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erişim Kısıtlı</h2>
        <p className="text-muted-foreground">
          Bu sayfayı yalnızca yöneticiler görüntüleyebilir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abonelik Bilgileriniz</h1>
          <p className="text-muted-foreground">
            Abonelik durumunuzu ve plan detaylarınızı görüntüleyin
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">{subscription?.plan_name || "Abonelik Yok"}</CardTitle>
                  <CardDescription>Mevcut abonelik planınız</CardDescription>
                </div>
              </div>
              {subscription?.is_active && plan && (
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
                    {plan.price.toLocaleString("tr-TR")} ₺
                  </p>
                  <p className="text-sm text-muted-foreground">/ {plan.period_label}</p>
                </div>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {subscription?.is_active ? (
              <div className="grid gap-6 sm:grid-cols-3">
                {/* Start Date */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Başlangıç Tarihi</p>
                    <p className="font-semibold">{formatDate(subscription.start_date)}</p>
                  </div>
                </div>

                {/* End Date */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bitiş Tarihi</p>
                    <p className="font-semibold">{formatDate(subscription.end_date)}</p>
                  </div>
                </div>

                {/* Days Remaining */}
                <div className={cn(
                  "flex items-center gap-3 p-4 rounded-xl",
                  subscription.days_remaining <= 7 ? "bg-amber-50" : "bg-green-50"
                )}>
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    subscription.days_remaining <= 7 ? "bg-amber-100" : "bg-green-100"
                  )}>
                    <Clock className={cn(
                      "h-5 w-5",
                      subscription.days_remaining <= 7 ? "text-amber-600" : "text-green-600"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kalan Süre</p>
                    <p className={cn(
                      "font-semibold",
                      subscription.days_remaining <= 7 ? "text-amber-700" : "text-green-700"
                    )}>
                      {subscription.days_remaining} gün
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aktif Abonelik Bulunamadı</h3>
                <p className="text-muted-foreground mb-4">
                  CraftForge'un tüm özelliklerini kullanmak için abonelik satın alın.
                </p>
                <Button>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Abonelik Satın Al
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Features Card */}
        {plan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Plan Özellikleri
              </CardTitle>
              <CardDescription>
                {plan.name} planının içerdiği özellikler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Payment History Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Ödeme Geçmişi
            </CardTitle>
            <CardDescription>
              Son ödeme işlemleriniz
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription?.is_active ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Aylık Abonelik</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(subscription.start_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{plan?.price.toLocaleString("tr-TR")} ₺</p>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      Başarılı
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Henüz ödeme kaydı bulunmuyor</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <AlertCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-primary">Sanal POS Entegrasyonu</p>
            <p className="text-sm text-muted-foreground">
              Şu an için ödeme sistemi geliştirme aşamasındadır. Sanal POS altyapısı (iyzico, Param vb.) 
              bağlandığında gerçek ödeme işlemleri aktif olacaktır.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
