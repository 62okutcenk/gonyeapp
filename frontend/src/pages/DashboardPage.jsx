import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const statusLabels = {
  bekliyor: "Bekliyor",
  planlandi: "Planlandı",
  uretimde: "Üretimde",
  kontrol: "Kontrol",
  tamamlandi: "Tamamlandı",
};

const statusStyles = {
  bekliyor: "status-bekliyor",
  planlandi: "status-planlandi",
  uretimde: "status-uretimde",
  kontrol: "status-kontrol",
  tamamlandi: "status-tamamlandi",
};

const StatCard = ({ title, value, icon: Icon, description, trend, loading }) => (
  <Card className="hover-lift">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <>
          <div className="text-3xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {trend && <TrendingUp className="h-3 w-3 text-green-500" />}
              {description}
            </p>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/dashboard/stats`);
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-slide-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
          <p className="text-muted-foreground">
            Projelerinizi ve görevlerinizi takip edin
          </p>
        </div>
        <Button asChild data-testid="new-project-button">
          <Link to="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Proje
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Proje"
          value={stats?.total_projects || 0}
          icon={FolderKanban}
          loading={loading}
        />
        <StatCard
          title="Aktif Proje"
          value={stats?.active_projects || 0}
          icon={Clock}
          description="Devam eden"
          loading={loading}
        />
        <StatCard
          title="Tamamlanan"
          value={stats?.completed_projects || 0}
          icon={CheckCircle2}
          description="Bu ay"
          trend
          loading={loading}
        />
        <StatCard
          title="Ekip Üyesi"
          value={stats?.user_count || 0}
          icon={Users}
          loading={loading}
        />
      </div>

      {/* Progress & Recent Projects */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Completion */}
        <Card>
          <CardHeader>
            <CardTitle>Görev İlerlemesi</CardTitle>
            <CardDescription>
              Tüm projelerdeki toplam görev tamamlanma oranı
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-24" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {stats?.completed_tasks || 0} / {stats?.total_tasks || 0} görev tamamlandı
                  </span>
                  <span className="font-medium">
                    %{Math.round(stats?.task_completion_rate || 0)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${stats?.task_completion_rate || 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span>Tamamlanan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-muted" />
                    <span>Bekleyen</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Son Projeler</CardTitle>
              <CardDescription>En son oluşturulan projeler</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/projects">
                Tümünü Gör
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : stats?.recent_projects?.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Henüz proje oluşturulmamış
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to="/projects/new">
                    <Plus className="mr-2 h-4 w-4" />
                    İlk Projeyi Oluştur
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {stats?.recent_projects?.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(project.created_at).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn(statusStyles[project.status])}>
                      {statusLabels[project.status]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Hızlı İşlemler</CardTitle>
          <CardDescription>Sık kullanılan işlemlere hızlı erişim</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link to="/projects/new">
                <Plus className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Yeni Proje</p>
                  <p className="text-xs text-muted-foreground">Proje oluştur</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link to="/setup/workitems">
                <Plus className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">İş Kalemi</p>
                  <p className="text-xs text-muted-foreground">Yeni iş kalemi ekle</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link to="/users">
                <Users className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Kullanıcılar</p>
                  <p className="text-xs text-muted-foreground">Ekip yönetimi</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link to="/setup/settings">
                <FolderKanban className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Ayarlar</p>
                  <p className="text-xs text-muted-foreground">Firma ayarları</p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
