import * as React from 'react';
import { Search, UserPlus, X, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Select } from '../../components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchUsersAction,
  createUserAction,
  updateUserAction,
  deleteUserAction,
  toggleUserStatusAction,
} from '../../Actions/userActions';
import type { ManagedUser, UserRole } from '../../types';

const ROLE_OPTIONS = [
  { value: 'store', label: 'Store' },
  { value: 'optum', label: 'Optum' },
  { value: 'admin', label: 'Admin' },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'store' as UserRole,
  mobile: '',
  storeName: '',
};

export function AdminScreen() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const users = useAppSelector((state) => state.users.users);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEmail, setEditingEmail] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    dispatch(fetchUsersAction());
  }, [dispatch]);

  const filteredUsers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEmail(null);
    setForm(EMPTY_FORM);
  };

  const handleAddNewClick = () => {
    if (isFormOpen && !editingEmail) {
      closeForm();
    } else {
      setEditingEmail(null);
      setForm(EMPTY_FORM);
      setIsFormOpen(true);
    }
  };

  const handleEditClick = (u: ManagedUser) => {
    setEditingEmail(u.email);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      mobile: u.mobile || '',
      storeName: u.storeName || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingEmail) {
        await dispatch(updateUserAction(editingEmail, {
          name: form.name,
          password: form.password || undefined,
          role: form.role,
          mobile: form.mobile || undefined,
          storeName: form.role === 'store' ? form.storeName || undefined : undefined,
        }));
        toast({ title: 'User Updated', description: `${form.name} has been saved.`, type: 'success' });
      } else {
        await dispatch(createUserAction({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          mobile: form.mobile || undefined,
          storeName: form.role === 'store' ? form.storeName || undefined : undefined,
        }));
        toast({ title: 'User Created', description: `${form.name} has been added.`, type: 'success' });
      }
      closeForm();
    } catch (e) {
      const err = e as Error;
      toast({ title: editingEmail ? 'Failed to Update User' : 'Failed to Create User', description: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (email: string, currentStatus: 'active' | 'inactive') => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await dispatch(toggleUserStatusAction(email, nextStatus));
    } catch (e) {
      const err = e as Error;
      toast({ title: 'Failed to Update Status', description: err.message, type: 'error' });
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    if (!window.confirm(`Delete ${u.name || u.email}? This cannot be undone.`)) return;
    try {
      await dispatch(deleteUserAction(u.email));
      toast({ title: 'User Deleted', description: `${u.name || u.email} has been removed.`, type: 'success' });
      if (editingEmail === u.email) closeForm();
    } catch (e) {
      const err = e as Error;
      toast({ title: 'Failed to Delete User', description: err.message, type: 'error' });
    }
  };

  return (
    <AppLayout consoleLabel="Admin Console">
      <main className="flex-1 px-8 py-6 space-y-6 w-full max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-lg font-bold text-foreground">User Directory</h1>
          <p className="text-sm text-muted-foreground">Search, filter, and manage system access</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:max-w-md">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or role..."
              icon={Search}
              className="bg-card border-border"
            />
          </div>
          <Button
            onClick={handleAddNewClick}
            className="rounded-xl gap-2 h-10 bg-[#1a2b6e] hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-bold text-xs px-5 w-full sm:w-auto shadow-sm transition-all active:scale-98"
          >
            {isFormOpen && !editingEmail ? <X size={16} /> : <UserPlus size={16} />}
            {isFormOpen && !editingEmail ? 'Cancel' : 'Add User'}
          </Button>
        </div>

        {isFormOpen && (
          <Card>
            <CardHeader>
              <CardTitle>{editingEmail ? 'Edit User' : 'New User'}</CardTitle>
              <CardDescription>
                {editingEmail ? `Update details for ${form.email}.` : 'Create a store, optum, or admin account.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!!editingEmail}
                  required
                />
                <Input
                  type="password"
                  placeholder={editingEmail ? 'New password (leave blank to keep current)' : 'Password (min 6 characters)'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={6}
                  required={!editingEmail}
                />
                <Select
                  options={ROLE_OPTIONS}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                />
                <Input
                  placeholder="Mobile number"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                />
                {form.role === 'store' && (
                  <Input
                    placeholder="Store name"
                    value={form.storeName}
                    onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  />
                )}
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : editingEmail ? 'Save Changes' : 'Create User'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] font-bold text-xs uppercase text-muted-foreground">#</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground">User Name</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground">Email</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground">Role</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground">Mobile</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground">Last Login</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u, idx) => (
                  <TableRow key={u.email}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-semibold text-foreground">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role}>{u.role.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.mobile || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.status === 'active'}
                          onCheckedChange={() => handleToggleStatus(u.email, u.status)}
                        />
                        <Badge variant={u.status}>{u.status.toUpperCase()}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(u)}
                          title="Edit user"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(u)}
                          disabled={currentUser?.email === u.email}
                          title={currentUser?.email === u.email ? "You can't delete your own account" : 'Delete user'}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </AppLayout>
  );
}
