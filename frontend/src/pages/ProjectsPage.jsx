import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, Search, Calendar, User, Briefcase, 
  ArrowRight, MoreHorizontal, Filter 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

export default function ProjectsPage() {
  const { token, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // active, stopped, completed

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]); // Filtre değişince yeniden çek

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // Backend'e status parametresi gönderiyoruz
      const response = await axios.get(`${API_URL}/projects`, {
        params: { status: statusFilter }
      });
      setProjects(response.data);
    } catch (error) {
      console.error("Projeler yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const styles = {
      planlandi: "bg-blue-100 text-blue-800 border-blue-200",
      uretimde: "bg-yellow-100 text-yellow-800 border-yellow-200",
      montaj: "bg-purple-100 text-purple-800 border-purple-200",
      tamamlandi: "bg-green-100 text-green-800 border-green-200",
      durduruldu: "bg-red-100 text-red-800 border-red-200",
    };
    
    const labels = {
      planlandi: "Planlandı",
      uretimde: "Üretimde",
      montaj: "Montajda",
      tamamlandi: "Tamamlandı",
      durduruldu: "Durduruldu",
    };

    return (
      <Badge variant="outline" className={styles[status] || "bg-gray-100"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projeler</h1>
          <p className="text-muted-foreground mt-1">
            Tüm marangozluk projelerinizi ve durumlarını buradan yönetin.
          </p>
        </div>
        
        {hasPermission("projects.create") && (
          <Button onClick={() => navigate("/projects/new")}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Proje
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border">
        <Tabs defaultValue="active" className="w-full md:w-auto" onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="active">Aktif Projeler</TabsTrigger>
            <TabsTrigger value="stopped">Durdurulanlar</TabsTrigger>
            <TabsTrigger value="completed">Tamamlananlar</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Proje veya müşteri ara..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Proje Adı</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İlerleme</TableHead>
              <TableHead>Alanlar</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Proje bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <TableRow 
                  key={project.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      {project.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      {project.customer_name}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ width: `${project.progress}%` }} 
                          />
                       </div>
                       <span className="text-xs text-muted-foreground">%{Math.round(project.progress)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {project.area_count || 0} Alan
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(project.created_at).toLocaleDateString("tr-TR")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}