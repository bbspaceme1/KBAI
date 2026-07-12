import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  adminCreateUser,
  adminGrantRole,
  adminDeleteUser,
  adminListUsers,
  adminUpdateUser,
} from "@/lib/portfolio.functions";
import { toast } from "sonner";
import { UserPlus, Shield, Trash2, Pencil, LineChart } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const Route = createFileRoute("/_app/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<null | {
    id: string;
    email: string;
    username: string;
    display_name: string | null;
  }>(null);

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    enabled: !!auth.user?.id,
    queryFn: async () => {
      return adminListUsers();
    },
  });

  const grantMut = useMutation({
    mutationFn: (vars: { target_user_id: string; role: "admin" | "user" | "advisor" }) =>
      adminGrantRole({ target_user_id: vars.target_user_id, role: vars.role }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (target_user_id: string) => adminDeleteUser({ target_user_id }),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const adminCount = (usersQ.data ?? []).filter((u) => u.roles.includes("admin")).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4" /> Tambah User
            </Button>
          </DialogTrigger>
          <CreateUserDialog
            adminId={auth.user!.id}
            onDone={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["admin-users"] });
            }}
          />
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usersQ.data ?? []).map((u) => {
                  const isAdmin = u.roles.includes("admin");
                  const isSelf = u.id === auth.user?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{u.display_name ?? "—"}</TableCell>
                      <TableCell className="space-x-1">
                        {u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
                            {r}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>
                        {format(new Date(u.created_at), "dd MMM yyyy", { locale: idLocale })}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditing({
                              id: u.id,
                              email: u.email,
                              username: u.username,
                              display_name: u.display_name,
                            })
                          }
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        {!isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (
                                !confirm(
                                  `Jadikan ${u.username} sebagai admin? Mereka akan punya akses penuh ke sistem.`,
                                )
                              )
                                return;
                              grantMut.mutate({ target_user_id: u.id, role: "admin" });
                            }}
                          >
                            <Shield className="h-3 w-3" /> Make admin
                          </Button>
                        )}
                        {!u.roles.includes("advisor") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              grantMut.mutate({ target_user_id: u.id, role: "advisor" })
                            }
                          >
                            <LineChart className="h-3 w-3" /> Make advisor
                          </Button>
                        )}
                        {!isSelf && !(isAdmin && adminCount <= 1) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const warning = isAdmin
                                ? `⚠️ Hapus admin ${u.username}? Sisa admin: ${adminCount - 1}`
                                : `Hapus user ${u.username}?`;
                              if (confirm(warning)) deleteMut.mutate(u.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        {!isSelf && isAdmin && adminCount <= 1 && (
                          <span className="text-[10px] text-muted-foreground">Admin terakhir</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <EditUserDialog
          adminId={auth.user!.id}
          user={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-users"] });
          }}
        />
      )}
    </div>
  );
}

function CreateUserDialog({ adminId, onDone }: { adminId: string; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminCreateUser({
        email: email.trim(),
        password,
        username: username.trim(),
        display_name: displayName.trim() || undefined,
      });
      toast.success(`User ${username} dibuat`);
      setEmail("");
      setPassword("");
      setUsername("");
      setDisplayName("");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Tambah User Baru</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Username (alphanumeric)</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            pattern="[a-zA-Z0-9_]+"
            minLength={2}
            maxLength={50}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Display Name (opsional)</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label>Password (min 6 char)</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Membuat..." : "Buat User"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditUserDialog({
  adminId,
  user,
  onClose,
  onDone,
}: {
  adminId: string;
  user: { id: string; email: string; username: string; display_name: string | null };
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminUpdateUser({
        data: {
          target_user_id: user.id,
          email: email.trim(),
          username: username.trim(),
          display_name: displayName.trim() || undefined,
          ...(password ? { password } : {}),
        },
      });
      toast.success("User diperbarui");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email login</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              pattern="[a-zA-Z0-9_]+"
              minLength={2}
              maxLength={50}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Password baru (opsional)</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              placeholder="Kosongkan jika tidak diubah"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
