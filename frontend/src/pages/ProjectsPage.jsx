import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  User,
  MoreHorizontal,
  Eye,
  Trash2,
  MapPin,
  Wallet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const statusLabels = {
  planlandi: "Planlandı",
  uretimde: "Üretimde",
  montaj: "Montaj",
  tamamlandi: "Tamamlandı",
};

const statusStyles = {
  planlandi: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  uretimde: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  montaj: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  tamamlandi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      toast.error("Projeler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await axios.delete(`${API_URL}/projects/${deleteId}`);
      setProjects((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success("Proje silindi");
    } catch (error) {
      toast.error("Proje silinirken hata oluştu");
    } finally {
      setDeleteId(null);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projeler</h1>
          <p className="text-muted-foreground">Tüm projelerinizi yönetin</p>
        </div>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Proje
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Proje veya müşteri ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Proje bulunamadı</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {searchTerm || statusFilter !== "all"
                ? "Arama kriterlerinize uygun proje yok"
                : "İlk projenizi oluşturmaya başlayın"}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button asChild className="mt-4">
                <Link to="/projects/new">Proje Oluştur</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      <Link
                        to={`/projects/${project.id}`}
                        className="hover:underline"
                      >
                        {project.name}
                      </Link>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {project.customer_name || "Müşteri belirtilmemiş"}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/projects/${project.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Görüntüle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(project.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status & Areas */}
                <div className="flex items-center justify-between">
                  <Badge className={cn("font-medium", statusStyles[project.status])}>
                    {statusLabels[project.status] || project.status}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {project.areas?.length || 0} Alan
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">İlerleme</span>
                    <span className="font-medium">{Math.round(project.progress || 0)}%</span>
                  </div>
                  <Progress value={project.progress || 0} className="h-2" />
                </div>

                {/* Finance */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Toplam:</span>
                    <span className="font-semibold">
                      {formatCurrency(project.finance?.total_agreed || 0)}
                    </span>
                  </div>
                  {project.finance?.total_remaining > 0 && (
                    <span className="text-xs text-orange-600 dark:text-orange-400">
                      Kalan: {formatCurrency(project.finance.total_remaining)}
                    </span>
                  )}
                </div>

                {/* Date */}
                {project.due_date && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Termin: {new Date(project.due_date).toLocaleDateString("tr-TR")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projeyi silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Projeye ait tüm alanlar, görevler ve tahsilatlar da silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
