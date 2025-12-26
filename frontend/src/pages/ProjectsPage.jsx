import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";

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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  MoreHorizontal,
  Eye,
  Trash2,
  Wallet,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  FileText,
  Copy,
  ExternalLink,
  Save,
  Layers,
  ChevronDown,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const statusLabels = {
  planlandi: "Planlandı",
  uretimde: "Üretimde",
  montaj: "Montaj",
  tamamlandi: "Tamamlandı",
};

const statusStyles = {
  planlandi: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  uretimde:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  montaj:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  tamamlandi:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

function safeLower(v) {
  return (v ?? "").toString().toLowerCase();
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clampStr(s, max = 50) {
  const str = (s ?? "").toString();
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

const VIEWS_STORAGE_KEY = "projects_table_views_v4";

// Select kolonu için tek noktadan sabit ölçü (header/body aynı)
const SELECT_COL_CLASS = "w-[44px] px-3";
const CELL_Y = "py-3"; // hem header hem body

export default function ProjectsPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Table states
  const [sorting, setSorting] = useState(/** @type {SortingState} */ ([]));
  const [columnFilters, setColumnFilters] = useState(
    /** @type {ColumnFiltersState} */ ([])
  );
  const [columnVisibility, setColumnVisibility] = useState(
    /** @type {VisibilityState} */ ({})
  );
  const [rowSelection, setRowSelection] = useState({});

  // Minimal filters
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Views
  const [views, setViews] = useState(() => {
    try {
      const raw = localStorage.getItem(VIEWS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // Delete
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(views));
    } catch {
      // ignore
    }
  }, [views]);

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
    } catch {
      toast.error("Proje silinirken hata oluştu");
    } finally {
      setDeleteId(null);
    }
  };

  const data = useMemo(() => projects || [], [projects]);

  const columns = useMemo(() => {
    /** @type {ColumnDef<any>[]} */
    return [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
              aria-label="Tümünü seç"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
              aria-label="Satırı seç"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 44,
      },

      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            Proje
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="min-w-[360px] leading-none">
              <span className="font-semibold" title={p.name}>
                {clampStr(p.name, 44)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                • {clampStr(p.customer_name || "Müşteri belirtilmemiş", 44)}
              </span>
            </div>
          );
        },
        filterFn: (row, _id, value) => {
          const v = safeLower(value);
          const p = row.original;
          return (
            safeLower(p.name).includes(v) || safeLower(p.customer_name).includes(v)
          );
        },
      },

      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Durum
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const s = row.original.status;
          return (
            <Badge className={cn("font-medium", statusStyles[s])}>
              {statusLabels[s] || s}
            </Badge>
          );
        },
        filterFn: (row, _id, value) => {
          if (!value) return true;
          return row.original.status === value;
        },
      },

      {
        id: "progress",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            İlerleme
          </Button>
        ),
        accessorFn: (row) => Number(row.progress || 0),
        cell: ({ row }) => {
          const v = Number(row.getValue("progress") || 0);
          const pct = Math.max(0, Math.min(100, Math.round(v)));
          return (
            <div className="min-w-[220px]">
              <div className="relative">
                <Progress value={pct} className="h-6" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold">
                  {pct}%
                </div>
              </div>
            </div>
          );
        },
      },

      {
        id: "total",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Toplam
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        accessorFn: (row) => Number(row.finance?.total_agreed || 0),
        cell: ({ row }) => {
          const total = toNumber(row.getValue("total"));
          return <span className="font-semibold">{formatCurrency(total)}</span>;
        },
      },

      {
        accessorKey: "due_date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Termin
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const d = row.original.due_date;
          if (!d) return <span className="text-muted-foreground">—</span>;
          return <span>{new Date(d).toLocaleDateString("tr-TR")}</span>;
        },
        sortingFn: (a, b) => {
          const ad = a.original.due_date
            ? new Date(a.original.due_date).getTime()
            : 0;
          const bd = b.original.due_date
            ? new Date(b.original.due_date).getTime()
            : 0;
          return ad - bd;
        },
      },

      {
        id: "actions",
        header: () => <span className="sr-only">Aksiyonlar</span>,
        cell: ({ row }) => {
          const project = row.original;

          const copyId = async () => {
            try {
              await navigator.clipboard.writeText(String(project.id));
              toast.success("ID kopyalandı");
            } catch {
              toast.error("ID kopyalanamadı");
            }
          };

          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Görüntüle
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={`/projects/${project.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Yeni sekmede aç
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyId}>
                    <Copy className="mr-2 h-4 w-4" />
                    ID Kopyala
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ];
  }, [navigate]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: globalSearch,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = safeLower(filterValue);
      if (!q) return true;
      const p = row.original;
      return (
        safeLower(p.name).includes(q) ||
        safeLower(p.customer_name).includes(q) ||
        safeLower(statusLabels[p.status] || p.status).includes(q) ||
        safeLower(p.id).includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // status filter -> columnFilters
  useEffect(() => {
    if (statusFilter === "all") {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "status"));
    } else {
      setColumnFilters((prev) => {
        const next = prev.filter((f) => f.id !== "status");
        next.push({ id: "status", value: statusFilter });
        return next;
      });
    }
  }, [statusFilter]);

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalFiltered = table.getFilteredRowModel().rows.length;

  const clearAll = () => {
    setGlobalSearch("");
    setStatusFilter("all");
    table.resetColumnFilters();
    table.resetSorting();
    table.resetRowSelection();
  };

  const getExportRows = () => {
    const selected = table.getFilteredSelectedRowModel().rows;
    if (selected.length > 0) return selected.map((r) => r.original);
    return table.getFilteredRowModel().rows.map((r) => r.original);
  };

  const getVisibleExportColumns = () => {
    const cols = table
      .getAllLeafColumns()
      .filter((c) => c.getIsVisible())
      .map((c) => c.id);

    return cols.filter((id) => id !== "select" && id !== "actions");
  };

  const buildExportRecord = (p, colId) => {
    switch (colId) {
      case "name":
        return p.name;
      case "status":
        return statusLabels[p.status] || p.status;
      case "progress":
        return `${Math.round(Number(p.progress || 0))}%`;
      case "total":
        return Number(p.finance?.total_agreed || 0);
      case "due_date":
        return p.due_date ? new Date(p.due_date).toLocaleDateString("tr-TR") : "";
      default:
        return p[colId] ?? "";
    }
  };

  const exportExcel = () => {
    try {
      const rows = getExportRows();
      const cols = getVisibleExportColumns();

      const headerMap = {
        name: "Proje",
        status: "Durum",
        progress: "İlerleme",
        total: "Toplam",
        due_date: "Termin",
      };

      const sheetData = rows.map((p) => {
        const out = {};
        cols.forEach((cid) => {
          const key = headerMap[cid] || cid;
          out[key] = buildExportRecord(p, cid);
        });
        out["ID"] = p.id;
        out["Müşteri"] = p.customer_name || "";
        return out;
      });

      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Projeler");

      const fileName = `projeler_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Excel export oluşturuldu");
    } catch (e) {
      console.error(e);
      toast.error("Excel export başarısız");
    }
  };

  const exportPDF = () => {
    try {
      const rows = getExportRows();
      const cols = getVisibleExportColumns();

      const headerMap = {
        name: "Proje",
        status: "Durum",
        progress: "İlerleme",
        total: "Toplam",
        due_date: "Termin",
      };

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      doc.setFontSize(14);
      doc.text("Projeler Raporu", 40, 40);

      const head = [["ID", "Müşteri", ...cols.map((c) => headerMap[c] || c)]];
      const body = rows.map((p) => [
        String(p.id),
        p.customer_name || "",
        ...cols.map((cid) => {
          const v = buildExportRecord(p, cid);
          if (cid === "total") return formatCurrency(Number(v || 0));
          return v ?? "";
        }),
      ]);

      autoTable(doc, {
        startY: 60,
        head,
        body,
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fontSize: 9 },
        margin: { left: 40, right: 40 },
        didDrawPage: () => {
          doc.setFontSize(9);
          doc.text(
            `Oluşturma: ${new Date().toLocaleString("tr-TR")}`,
            40,
            doc.internal.pageSize.getHeight() - 20
          );
        },
      });

      const fileName = `projeler_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      toast.success("PDF export oluşturuldu");
    } catch (e) {
      console.error(e);
      toast.error("PDF export başarısız");
    }
  };

  const saveView = () => {
    const name = newViewName.trim();
    if (!name) {
      toast.error("Görünüm adı gerekli");
      return;
    }

    const payload = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name,
      createdAt: new Date().toISOString(),
      state: {
        globalSearch,
        statusFilter,
        sorting,
        columnFilters,
        columnVisibility,
        pageSize: table.getState().pagination.pageSize,
      },
    };

    setViews((prev) => [payload, ...prev]);
    setNewViewName("");
    setViewDialogOpen(false);
    toast.success("Görünüm kaydedildi");
  };

  const applyView = (view) => {
    const s = view.state || {};
    setGlobalSearch(s.globalSearch ?? "");
    setStatusFilter(s.statusFilter ?? "all");
    setSorting(s.sorting ?? []);
    setColumnFilters(s.columnFilters ?? []);
    setColumnVisibility(s.columnVisibility ?? {});
    table.setPageSize(Number(s.pageSize || 10));
    table.resetRowSelection();
    toast.success(`Görünüm yüklendi: ${view.name}`);
  };

  const deleteView = (id) => {
    setViews((prev) => prev.filter((v) => v.id !== id));
    toast.success("Görünüm silindi");
  };

  const hasAnyFilter =
    globalSearch || statusFilter !== "all" || columnFilters.length > 0 || sorting.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
            <FolderKanban className="h-6 w-6" />
            Projeler
          </h1>
          <p className="text-muted-foreground">Tüm projelerinizi yönetin</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Layers className="mr-2 h-4 w-4" />
                Görünümler
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px]">
              <DropdownMenuLabel className="inline-flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Kayıtlı Görünümler
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {views.length === 0 ? (
                <div className="px-2 py-6 text-sm text-muted-foreground text-center">
                  Kayıtlı görünüm yok.
                </div>
              ) : (
                views.map((v) => (
                  <div key={v.id} className="px-2 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        className="justify-start px-2 h-9 flex-1"
                        onClick={() => applyView(v)}
                        title={v.name}
                      >
                        <Layers className="mr-2 h-4 w-4" />
                        {clampStr(v.name, 26)}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => deleteView(v.id)}
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setViewDialogOpen(true)}>
                <Save className="mr-2 h-4 w-4" />
                Mevcut görünümü kaydet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>

          <Button asChild>
            <Link to="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Proje
            </Link>
          </Button>
        </div>
      </div>

      {/* Minimal Toolbar */}
      <div className="rounded-lg border bg-background p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ara: proje, müşteri, durum veya ID..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56">
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

          <div className="flex items-center gap-2 justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Kolonlar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Görünür Kolonlar
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((c) => c.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                      className="capitalize"
                    >
                      {column.id === "due_date" ? "termin" : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" disabled={!hasAnyFilter} onClick={clearAll}>
              <X className="mr-2 h-4 w-4" />
              Temizle
            </Button>
          </div>
        </div>

        {/* Meta row + Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
          <div className="text-muted-foreground">
            {table.getFilteredRowModel().rows.length} kayıt
            {selectedCount > 0 && (
              <>
                {" "}
                • <span className="font-medium">{selectedCount} seçili</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Sonraki
            </Button>

            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / sayfa
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* DataTable */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "bg-muted/40",
                      CELL_Y,
                      header.column.id === "select" ? SELECT_COL_CLASS : undefined
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const project = row.original;
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "align-middle",
                          CELL_Y,
                          cell.column.id === "select"
                            ? SELECT_COL_CLASS
                            : undefined
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-32"
                >
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <div className="mt-1 font-medium text-foreground">
                      Kayıt bulunamadı
                    </div>
                    <div className="text-sm">
                      Aramayı veya durum filtresini değiştirin.
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Save View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <Save className="h-5 w-5" />
              Görünüm Kaydet
            </DialogTitle>
            <DialogDescription>
              Mevcut arama/durum/sıralama/kolon ayarlarınızı isim vererek kaydedin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Input
              placeholder="Örn: Tamamlanan projeler"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={saveView}>
              <Save className="mr-2 h-4 w-4" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Projeyi silmek istediğinize emin misiniz?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Projeye ait tüm alanlar, görevler ve
              tahsilatlar da silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
