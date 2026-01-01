import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  AlertCircle,
  ListTodo,
  BarChart3,
  PieChart as PieChartIcon,
  Pause,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const statusLabels = {
  planlandi: "Planlandı",
  uretimde: "Üretimde",
  montaj: "Montaj",
  kontrol: "Kontrol",
  tamamlandi: "Tamamlandı",
  durduruldu: "Durduruldu",
};

const statusStyles = {
  planlandi: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  uretimde: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  montaj: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  kontrol: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  tamamlandi: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  durduruldu: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const taskStatusLabels = {
  bekliyor: "Bekliyor",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
};

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, description, trend, loading, color = "primary", onClick }) => (
  <Card 
    className={cn("hover:shadow-md transition-shadow", onClick && "cursor-pointer")}
    onClick={onClick}
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center",
        color === "primary" && "bg-primary/10",
        color === "green" && "bg-emerald-100 dark:bg-emerald-900/30",
        color === "amber" && "bg-amber-100 dark:bg-amber-900/30",
        color === "red" && "bg-rose-100 dark:bg-rose-900/30",
        color === "blue" && "bg-blue-100 dark:bg-blue-900/30",
      )}>
        <Icon className={cn(
          "h-5 w-5",
          color === "primary" && "text-primary",
          color === "green" && "text-emerald-600 dark:text-emerald-400",
          color === "amber" && "text-amber-600 dark:text-amber-400",
          color === "red" && "text-rose-600 dark:text-rose-400",
          color === "blue" && "text-blue-600 dark:text-blue-400",
        )} />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
              {trend === "down" && <TrendingDown className="h-3 w-3 text-rose-500" />}
              {description}
            </p>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Permission helper
  const hasPermission = (permission) => {
    return user?.is_admin || user?.permissions_list?.includes(permission);
  };

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

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium">{label || payload[0].name}</p>
          <p className="text-muted-foreground">
            {payload[0].dataKey === "amount" 
              ? formatCurrency(payload[0].value)
              : `${payload[0].value} ${payload[0].dataKey === "active_tasks" ? "görev" : ""}`
            }
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-slide-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hoş geldiniz, {user?.full_name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground">
            İşte bugünkü özet bilgileriniz
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          {hasPermission("projects.create") && (
            <Button asChild data-testid="new-project-button">
              <Link to="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Proje
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* My Urgent Tasks - Always visible for everyone */}
      {(stats?.my_urgent_tasks?.length > 0 || stats?.pending_tasks_count > 0) && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg">Yapılacaklar Listem</CardTitle>
                {stats?.pending_tasks_count > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                    {stats.pending_tasks_count} bekliyor
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stats?.my_urgent_tasks?.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Tüm görevleriniz tamamlandı!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats?.my_urgent_tasks?.map((task) => (
                  <Link
                    key={task.id}
                    to={`/projects/${task.project_id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        task.status === "bekliyor" && "bg-amber-500",
                        task.status === "devam_ediyor" && "bg-blue-500",
                      )} />
                      <div>
                        <p className="font-medium text-sm">{task.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.project_name} • {task.area_name}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {taskStatusLabels[task.status] || task.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI Stats Grid */}
      <div className={cn(
        "grid gap-4",
        stats?.finance ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3"
      )}>
        <StatCard
          title="Toplam Proje"
          value={stats?.total_projects || 0}
          icon={FolderKanban}
          loading={loading}
          onClick={() => navigate("/projects")}
        />
        <StatCard
          title="Aktif Proje"
          value={stats?.active_projects || 0}
          icon={Clock}
          description="Devam eden projeler"
          loading={loading}
          color="amber"
          onClick={() => navigate("/projects")}
        />
        <StatCard
          title="Tamamlanan"
          value={stats?.completed_projects || 0}
          icon={CheckCircle2}
          trend="up"
          loading={loading}
          color="green"
          onClick={() => navigate("/projects")}
        />
        
        {/* Finance Cards - Only if user has permission */}
        {stats?.finance && (
          <StatCard
            title="Bekleyen Tahsilat"
            value={formatCurrency(stats.finance.total_remaining || 0)}
            icon={Wallet}
            description={`%${Math.round(stats.finance.collection_rate || 0)} tahsil edildi`}
            loading={loading}
            color={stats.finance.total_remaining > 0 ? "red" : "green"}
          />
        )}
      </div>

      {/* Finance Summary - Only for users with projects.manage_finance permission */}
      {stats?.finance && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Ciro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats.finance.total_revenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Anlaşılan toplam tutar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tahsil Edilen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(stats.finance.total_collected || 0)}
              </div>
              <Progress 
                value={stats.finance.collection_rate || 0} 
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>
          <Card className={stats.finance.total_remaining > 0 ? "border-rose-200 dark:border-rose-800" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Kalan Bakiye</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                stats.finance.total_remaining > 0 ? "text-rose-600" : "text-emerald-600"
              )}>
                {formatCurrency(stats.finance.total_remaining || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.finance.total_remaining > 0 ? "Tahsil edilmesi gereken" : "Tüm ödemeler alındı"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Status Distribution - Everyone sees their own data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              <CardTitle>Proje Durumu Dağılımı</CardTitle>
            </div>
            <CardDescription>
              {hasPermission("projects.view_all") ? "Tüm projeler" : "Atandığım projeler"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : stats?.project_status_distribution?.every(s => s.count === 0) ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Henüz proje yok</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats?.project_status_distribution?.filter(s => s.count > 0) || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="label"
                  >
                    {stats?.project_status_distribution?.filter(s => s.count > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Workload Chart - Only for users with users.view permission */}
        {stats?.workload ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Personel İş Yükü</CardTitle>
              </div>
              <CardDescription>Aktif görev dağılımı</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : stats?.workload?.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Henüz atanmış görev yok</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats?.workload || []} layout="vertical">
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="user_name" 
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="active_tasks" 
                      fill="#6366f1" 
                      radius={[0, 4, 4, 0]}
                      name="Aktif Görev"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        ) : (
          // Recent Projects for users without workload permission
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Son Projeler</CardTitle>
                <CardDescription>En son güncellenen projeler</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects">
                  Tümü
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : stats?.recent_projects?.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Henüz proje yok
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
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
                          <p className="font-medium text-sm">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.customer_name || "Müşteri belirtilmemiş"}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn("text-xs", statusStyles[project.status])}>
                        {statusLabels[project.status]}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Payments Chart - Only for finance permission */}
      {stats?.finance?.monthly_payments?.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Aylık Tahsilat Grafiği</CardTitle>
            </div>
            <CardDescription>Son 6 aylık tahsilat trendi</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.finance.monthly_payments}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const [year, month] = value.split("-");
                    const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
                    return monthNames[parseInt(month) - 1] || value;
                  }}
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), "Tahsilat"]}
                  labelFormatter={(label) => {
                    const [year, month] = label.split("-");
                    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
                    return `${monthNames[parseInt(month) - 1]} ${year}`;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Hızlı İşlemler</CardTitle>
          <CardDescription>Sık kullanılan işlemlere hızlı erişim</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {hasPermission("projects.create") && (
              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <Link to="/projects/new">
                  <Plus className="mr-3 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Yeni Proje</p>
                    <p className="text-xs text-muted-foreground">Proje oluştur</p>
                  </div>
                </Link>
              </Button>
            )}
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link to="/customers">
                <Users className="mr-3 h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium">Müşteriler</p>
                  <p className="text-xs text-muted-foreground">CRM yönetimi</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link to="/projects">
                <FolderKanban className="mr-3 h-5 w-5 text-amber-500" />
                <div className="text-left">
                  <p className="font-medium">Projeler</p>
                  <p className="text-xs text-muted-foreground">Tüm projeler</p>
                </div>
              </Link>
            </Button>
            {hasPermission("users.view") && (
              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <Link to="/users">
                  <Users className="mr-3 h-5 w-5 text-emerald-500" />
                  <div className="text-left">
                    <p className="font-medium">Kullanıcılar</p>
                    <p className="text-xs text-muted-foreground">Ekip yönetimi</p>
                  </div>
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
