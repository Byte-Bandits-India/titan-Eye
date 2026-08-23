import { Stethoscope, Store, UserPlus } from 'lucide-react';
import * as React from 'react';

import type { ManagedUser, OptometristUserRow, UserFormData } from '../../types';

import {
  createUserAction,
  deleteUserAction,
  fetchUsersAction,
  toggleUserStatusAction,
  updateUserAction,
} from '../../Actions/userActions';
import { AppLayout } from '../../components/layout/AppLayout';
import { MetricCard } from '../../components/shared/MetricCard';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { useToast } from '../../components/ui/toast';
import { usePagination } from '../../hooks/usePagination';
import { useAppDispatch, useAppSelector } from '../../store';
import { type DateFilterRange, filterUsersByDate } from '../../utils/dateFilter';
import { computeStoreAvailability } from '../../utils/optometristAvailability';
import { AdminCard } from './components/AdminCard';
import { DEFAULT_USER_COLUMNS, getRoleBasedUserId } from './components/adminUtils';
import { UserFormDrawer } from './components/UserFormDrawer';

export function SuperAdminScreen() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const users = useAppSelector((state) => state.users.users);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [dateRange, setDateRange] = React.useState<DateFilterRange>('all');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEmail, setEditingEmail] = React.useState<null | string>(null);
  const [userPageSize, setUserPageSize] = React.useState<number>(10);
  const [visibleUserCols, setVisibleUserCols] = React.useState<string[]>(DEFAULT_USER_COLUMNS);

  React.useEffect(() => {
    dispatch(fetchUsersAction());
  }, [dispatch]);

  const handleToggleUserCol = (id: string) => {
    setVisibleUserCols((prev) => (prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]));
  };

  const dateFilteredUsers = React.useMemo(() => filterUsersByDate(users, dateRange), [users, dateRange]);

  const filteredUsers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return dateFilteredUsers;
    }

    return dateFilteredUsers.filter((u) => {
      const userId = getRoleBasedUserId(u, users).toLowerCase();
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const mobile = (u.mobile || '').toLowerCase();
      const storeName = (u.storeName || '').toLowerCase();
      const status = (u.status || '').toLowerCase();
      const lastLoginStr = u.lastLogin ? new Date(u.lastLogin).toLocaleString().toLowerCase() : 'never';

      return (
        userId.includes(term) ||
        name.includes(term) ||
        email.includes(term) ||
        role.includes(term) ||
        mobile.includes(term) ||
        storeName.includes(term) ||
        status.includes(term) ||
        lastLoginStr.includes(term)
      );
    });
  }, [dateFilteredUsers, searchTerm, users]);

  const {
    currentPage: userCurrentPage,
    nextPage: userNextPage,
    paginatedItems: paginatedUsers,
    prevPage: userPrevPage,
    resetPage: userResetPage,
    totalItems: userTotalItems,
    totalPages: userTotalPages,
  } = usePagination(filteredUsers, userPageSize);

  React.useEffect(() => {
    userResetPage();
  }, [searchTerm, dateRange, userPageSize, filteredUsers.length, userResetPage]);

  const storeUsersWithStatus = React.useMemo<OptometristUserRow[]>(
    () => computeStoreAvailability(users),
    [users]
  );

  const totalOptometrists = React.useMemo(
    () => users.filter((u) => u.role === 'optometrist' || u.role === 'senior_optometrist').length,
    [users]
  );
  const totalStores = React.useMemo(() => users.filter((u) => u.role === 'store').length, [users]);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEmail(null);
  };

  const handleAddNewClick = () => {
    setEditingEmail(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (u: ManagedUser) => {
    setEditingEmail(u.email);
    setIsFormOpen(true);
  };

  const handleSubmitUser = async (formData: UserFormData, isEdit: boolean) => {
    const isAdminLike = formData.role === 'super_admin' || formData.role === 'senior_optometrist';

    if (isEdit && editingEmail) {
      await dispatch(
        updateUserAction(editingEmail, {
          city: formData.role === 'store' ? formData.city || undefined : undefined,
          languages: formData.role === 'optometrist' ? formData.languages : undefined,
          location: formData.role === 'store' ? formData.location || undefined : undefined,
          mobile: !isAdminLike ? formData.mobile || undefined : undefined,
          name: formData.role === 'optometrist' ? formData.name || undefined : undefined,
          password: formData.password || undefined,
          role: formData.role,
          storeName: formData.role === 'store' ? formData.storeName || undefined : undefined,
        })
      );
      toast({
        description: `${formData.email} has been saved.`,
        title: 'User Updated',
        type: 'success',
      });
    } else {
      await dispatch(
        createUserAction({
          city: formData.role === 'store' ? formData.city || undefined : undefined,
          email: formData.email,
          languages: formData.role === 'optometrist' ? formData.languages : undefined,
          location: formData.role === 'store' ? formData.location || undefined : undefined,
          mobile: !isAdminLike ? formData.mobile || undefined : undefined,
          name: formData.role === 'optometrist' ? formData.name || undefined : undefined,
          password: formData.password,
          role: formData.role,
          storeName: formData.role === 'store' ? formData.storeName || undefined : undefined,
        })
      );
      toast({
        description: `${formData.email} has been added.`,
        title: 'User Created',
        type: 'success',
      });
    }

    closeForm();
  };

  const handleToggleStatus = async (email: string, currentStatus: 'active' | 'inactive') => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      await dispatch(toggleUserStatusAction(email, nextStatus));
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message,
        title: 'Failed to Update Status',
        type: 'error',
      });
    }
  };

  const handleDeleteUser = async (u: ManagedUser) => {
    if (!window.confirm(`Delete ${u.name || u.email}? This cannot be undone.`)) {
      return;
    }

    try {
      await dispatch(deleteUserAction(u.email));
      toast({
        description: `${u.name || u.email} has been removed.`,
        title: 'User Deleted',
        type: 'success',
      });

      if (editingEmail === u.email) {
        closeForm();
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message,
        title: 'Failed to Delete User',
        type: 'error',
      });
    }
  };

  return (
    <AppLayout consoleLabel="Super Admin Console">
      <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-[28px]">
              User Directory
            </h1>
            <p className="mt-0.5 text-sm font-normal text-muted-foreground sm:text-sm">
              Search, filter, and manage system access
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              className="active:scale-98 h-10 gap-2 px-4 text-sm font-medium shadow-sm transition-all"
              onClick={handleAddNewClick}
              variant="primary"
            >
              <UserPlus size={14} />
              Add User
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
          <div className="grid grid-rows-2 gap-4">
            <MetricCard
              icon={Store}
              iconGradient="from-blue-500 to-blue-800"
              label="Total Stores"
              unitPlural="Stores"
              unitSingular="Store"
              value={totalStores}
            />
            <MetricCard
              icon={Stethoscope}
              iconGradient="from-teal-500 to-teal-800"
              label="Total Optometrists"
              unitPlural="Optometrists"
              unitSingular="Optometrist"
              value={totalOptometrists}
            />
          </div>
          <AdminCard className="lg:col-span-2" data={storeUsersWithStatus} variant="store-users" />
        </div>

        <AdminCard
          currentPage={userCurrentPage}
          currentUser={currentUser}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onDelete={handleDeleteUser}
          onEdit={handleEditClick}
          onNextPage={userNextPage}
          onPageSizeChange={(size) => {
            setUserPageSize(size);
            userResetPage();
          }}
          onPrevPage={userPrevPage}
          onResetColumns={() => setVisibleUserCols(DEFAULT_USER_COLUMNS)}
          onSearchChange={setSearchTerm}
          onToggleColumn={handleToggleUserCol}
          onToggleStatus={handleToggleStatus}
          pageSize={userPageSize}
          paginatedUsers={paginatedUsers}
          searchTerm={searchTerm}
          totalItems={userTotalItems}
          totalPages={userTotalPages}
          users={users}
          variant="user-management"
          visibleColumns={visibleUserCols}
        />
      </main>

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
          }
        }}
        open={isFormOpen}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editingEmail ? 'Edit User Account' : 'Create New User Account'}</SheetTitle>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {editingEmail
                ? `Update details and credentials for ${editingEmail}.`
                : 'Fill in the information below to create a new user account with system role permissions.'}
            </p>
          </SheetHeader>
          <UserFormDrawer editingEmail={editingEmail} onSubmitUser={handleSubmitUser} />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
