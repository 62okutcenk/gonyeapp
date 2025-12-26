import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  ChevronRight,
  Loader2,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SetupGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Group dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", order: 0 });
  const [groupSaving, setGroupSaving] = useState(false);
  
  // Subtask dialog state
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [subtaskForm, setSubtaskForm] = useState({ name: "", description: "", order: 0, group_id: "" });
  const [subtaskSaving, setSubtaskSaving] = useState(false);
  
  // Delete confirmation
  const [deleteGroup, setDeleteGroup] = useState(null);
  const [deleteSubtask, setDeleteSubtask] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [groupsRes, subtasksRes] = await Promise.all([
        axios.get(`${API_URL}/groups`),
        axios.get(`${API_URL}/subtasks`),
      ]);
      setGroups(groupsRes.data);
      setSubtasks(subtasksRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Group handlers
  const openGroupDialog = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({ name: group.name, description: group.description || "", order: group.order });
    } else {
      setEditingGroup(null);
      setGroupForm({ name: "", description: "", order: groups.length + 1 });
    }
    setGroupDialogOpen(true);
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    setGroupSaving(true);

    try {
      if (editingGroup) {
        await axios.put(`${API_URL}/groups/${editingGroup.id}`, groupForm);
        toast.success("Grup güncellendi");
      } else {
        await axios.post(`${API_URL}/groups`, groupForm);
        toast.success("Grup oluşturuldu");
      }
      setGroupDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(editingGroup ? "Grup güncellenirken hata oluştu" : "Grup oluşturulurken hata oluştu");
    } finally {
      setGroupSaving(false);
    }
  };

  const handleGroupDelete = async () => {
    if (!deleteGroup) return;

    try {
      await axios.delete(`${API_URL}/groups/${deleteGroup.id}`);
      toast.success("Grup silindi");
      fetchData();
    } catch (error) {
      toast.error("Grup silinirken hata oluştu");
    } finally {
      setDeleteGroup(null);
    }
  };

  // Subtask handlers
  const openSubtaskDialog = (groupId, subtask = null) => {
    if (subtask) {
      setEditingSubtask(subtask);
      setSubtaskForm({
        name: subtask.name,
        description: subtask.description || "",
        order: subtask.order,
        group_id: subtask.group_id,
      });
    } else {
      setEditingSubtask(null);
      const groupSubtasks = subtasks.filter((s) => s.group_id === groupId);
      setSubtaskForm({
        name: "",
        description: "",
        order: groupSubtasks.length + 1,
        group_id: groupId,
      });
    }
    setSubtaskDialogOpen(true);
  };

  const handleSubtaskSubmit = async (e) => {
    e.preventDefault();
    setSubtaskSaving(true);

    try {
      if (editingSubtask) {
        await axios.put(`${API_URL}/subtasks/${editingSubtask.id}`, subtaskForm);
        toast.success("Alt görev güncellendi");
      } else {
        await axios.post(`${API_URL}/subtasks`, subtaskForm);
        toast.success("Alt görev oluşturuldu");
      }
      setSubtaskDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(editingSubtask ? "Alt görev güncellenirken hata oluştu" : "Alt görev oluşturulurken hata oluştu");
    } finally {
      setSubtaskSaving(false);
    }
  };

  const handleSubtaskDelete = async () => {
    if (!deleteSubtask) return;

    try {
      await axios.delete(`${API_URL}/subtasks/${deleteSubtask.id}`);
      toast.success("Alt görev silindi");
      fetchData();
    } catch (error) {
      toast.error("Alt görev silinirken hata oluştu");
    } finally {
      setDeleteSubtask(null);
    }
  };

  const getGroupSubtasks = (groupId) => subtasks.filter((s) => s.group_id === groupId);

  return (
    <div className="space-y-6 animate-slide-in" data-testid="setup-groups-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gruplar & Alt Görevler</h1>
          <p className="text-muted-foreground">
            Proje aşamalarını ve her aşamadaki görevleri yönetin
          </p>
        </div>
        <Button onClick={() => openGroupDialog()} data-testid="add-group-button">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Grup
        </Button>
      </div>

      {/* Groups List */}
      <Card>
        <CardHeader>
          <CardTitle>Aşama Grupları</CardTitle>
          <CardDescription>
            Her grup bir proje aşamasını temsil eder (Planlama, Üretim, Montaj vb.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground/50 mx-auto" />
              <p className="mt-4 text-muted-foreground">Henüz grup oluşturulmamış</p>
              <Button className="mt-4" onClick={() => openGroupDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                İlk Grubu Oluştur
              </Button>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {groups.map((group) => {
                const groupSubtasks = getGroupSubtasks(group.id);
                return (
                  <AccordionItem
                    key={group.id}
                    value={group.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Layers className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{group.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {groupSubtasks.length} alt görev
                            </Badge>
                          </div>
                          {group.description && (
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openGroupDialog(group)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteGroup(group)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="ml-14 space-y-2">
                        {groupSubtasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4">
                            Bu grupta henüz alt görev yok
                          </p>
                        ) : (
                          groupSubtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                            >
                              <div className="flex items-center gap-3">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{subtask.name}</p>
                                  {subtask.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {subtask.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openSubtaskDialog(group.id, subtask)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setDeleteSubtask(subtask)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => openSubtaskDialog(group.id)}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Alt Görev Ekle
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Grubu Düzenle" : "Yeni Grup"}</DialogTitle>
            <DialogDescription>
              Proje aşamasını temsil eden bir grup oluşturun
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGroupSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Grup Adı *</Label>
                <Input
                  id="group-name"
                  placeholder="Örn: Planlama"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  data-testid="group-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-description">Açıklama</Label>
                <Textarea
                  id="group-description"
                  placeholder="Grup hakkında kısa açıklama..."
                  value={groupForm.description}
                  onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-order">Sıralama</Label>
                <Input
                  id="group-order"
                  type="number"
                  min="0"
                  value={groupForm.order}
                  onChange={(e) => setGroupForm((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGroupDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={groupSaving} data-testid="save-group-button">
                {groupSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingGroup ? "Güncelle" : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Subtask Dialog */}
      <Dialog open={subtaskDialogOpen} onOpenChange={setSubtaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubtask ? "Alt Görevi Düzenle" : "Yeni Alt Görev"}</DialogTitle>
            <DialogDescription>
              Bu aşamada yapılacak bir görevi tanımlayın
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubtaskSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subtask-name">Görev Adı *</Label>
                <Input
                  id="subtask-name"
                  placeholder="Örn: Ölçü Alma"
                  value={subtaskForm.name}
                  onChange={(e) => setSubtaskForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  data-testid="subtask-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtask-description">Açıklama</Label>
                <Textarea
                  id="subtask-description"
                  placeholder="Görev hakkında kısa açıklama..."
                  value={subtaskForm.description}
                  onChange={(e) => setSubtaskForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubtaskDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={subtaskSaving} data-testid="save-subtask-button">
                {subtaskSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSubtask ? "Güncelle" : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grubu silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Grup ve tüm alt görevleri kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGroupDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subtask Confirmation */}
      <AlertDialog open={!!deleteSubtask} onOpenChange={() => setDeleteSubtask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alt görevi silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Alt görev kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubtaskDelete}
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
