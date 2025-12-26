import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { toast } from "sonner";
import { Shield, Plus, Edit2, Trash2, Loader2, Key } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SetupRolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", permissions: [] });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        axios.get(`${API_URL}/roles`),
        axios.get(`${API_URL}/permissions`),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (role = null) => {
    if (role) {
      setEditing(role);
      setForm({
        name: role.name,
        description: role.description || "",
        permissions: role.permissions || [],
      });
    } else {
      setEditing(null);
      setForm({ name: "", description: "", permissions: [] });
    }
    setDialogOpen(true);
  };

  const handlePermissionToggle = (permKey) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter((p) => p !== permKey)
        : [...prev.permissions, permKey],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editing) {
        await axios.put(`${API_URL}/roles/${editing.id}`, form);
        toast.success("Rol güncellendi");
      } else {
        await axios.post(`${API_URL}/roles`, form);
        toast.success("Rol oluşturuldu");
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(editing ? "Rol güncellenirken hata oluştu" : "Rol oluşturulurken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      await axios.delete(`${API_URL}/roles/${deleteItem.id}`);
      toast.success("Rol silindi");
      fetchData();
    } catch (error) {
      toast.error("Rol silinirken hata oluştu");
    } finally {
      setDeleteItem(null);
    }
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.key.split(".")[0];
    const categoryLabels = {
      projects: "Projeler",
      tasks: "Görevler",
      setup: "Kurulum",
      users: "Kullanıcılar",
      settings: "Ayarlar",
      files: "Dosyalar",
    };
    const label = categoryLabels[category] || category;
    if (!acc[label]) {
      acc[label] = [];
    }
    acc[label].push(perm);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-slide-in" data-testid="setup-roles-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roller & Yetkiler</h1>
          <p className="text-muted-foreground">
            Kullanıcı rollerini ve erişim yetkilerini yönetin
          </p>
        </div>
        <Button onClick={() => openDialog()} data-testid="add-role-button">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Rol
        </Button>
      </div>

      {/* Roles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))
        ) : roles.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">Henüz rol oluşturulmamış</p>
              <Button className="mt-4" onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                İlk Rolü Oluştur
              </Button>
            </CardContent>
          </Card>
        ) : (
          roles.map((role) => (
            <Card key={role.id} className="group hover-lift" data-testid={`role-${role.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openDialog(role)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteItem(role)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-4">{role.name}</CardTitle>
                {role.description && (
                  <CardDescription>{role.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Key className="h-4 w-4" />
                  <span>{role.permissions?.length || 0} yetki</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {role.permissions?.slice(0, 3).map((perm) => (
                    <Badge key={perm} variant="secondary" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                  {role.permissions?.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{role.permissions.length - 3}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Rolü Düzenle" : "Yeni Rol"}</DialogTitle>
            <DialogDescription>
              Rol bilgilerini ve sahip olacağı yetkileri belirleyin
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Rol Adı *</Label>
                  <Input
                    id="name"
                    placeholder="Örn: Üretim Sorumlusu"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    data-testid="role-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Input
                    id="description"
                    placeholder="Rol hakkında kısa açıklama"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Yetkiler</Label>
                <Card>
                  <ScrollArea className="h-64">
                    <div className="p-4 space-y-6">
                      {Object.entries(groupedPermissions).map(([category, perms]) => (
                        <div key={category}>
                          <h4 className="font-medium text-sm mb-3">{category}</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {perms.map((perm) => (
                              <label
                                key={perm.key}
                                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                              >
                                <Checkbox
                                  checked={form.permissions.includes(perm.key)}
                                  onCheckedChange={() => handlePermissionToggle(perm.key)}
                                  className="mt-0.5"
                                />
                                <div className="space-y-1">
                                  <p className="text-sm font-medium leading-none">
                                    {perm.name}
                                  </p>
                                  {perm.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={saving} data-testid="save-role-button">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Güncelle" : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rolü silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu role sahip kullanıcılar rolsüz kalacaktır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
