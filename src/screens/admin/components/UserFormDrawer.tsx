import { Eye, EyeOff, ShieldCheck, User } from 'lucide-react';
import * as React from 'react';

import type { UserFormData, UserRole } from '../../../types';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { LegacySelect as Select } from '../../../components/ui/select';
import { SheetBody, SheetFooter } from '../../../components/ui/sheet';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../lib/utils';
import { EMAIL_REGEX, MOBILE_REGEX, NAME_REGEX, PASSWORD_REGEX } from '../../../options/Option';
import { useAppSelector } from '../../../store';
import { EMPTY_FORM, ROLE_OPTIONS } from './adminUtils';

interface UserFormDrawerProps {
  editingEmail: null | string;
  onSubmitUser: (data: UserFormData, isEdit: boolean) => Promise<void>;
}

export function UserFormDrawer({ editingEmail, onSubmitUser }: UserFormDrawerProps) {
  const { toast } = useToast();
  const users = useAppSelector((state) => state.users.users);

  const [form, setForm] = React.useState<UserFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [prevEditingEmail, setPrevEditingEmail] = React.useState<null | string>(editingEmail);

  if (editingEmail !== prevEditingEmail) {
    setPrevEditingEmail(editingEmail);

    const existingUser = editingEmail ? users.find((u) => u.email === editingEmail) : null;

    setForm(
      existingUser
        ? {
            email: existingUser.email,
            mobile: existingUser.mobile || '',
            name: existingUser.name,
            password: '',
            role: existingUser.role,
            storeName: existingUser.storeName || '',
          }
        : EMPTY_FORM
    );
    setErrors({});
    setShowPassword(false);
  }

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];

      return next;
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (!NAME_REGEX.test(form.name.trim())) {
      newErrors.name = 'Name must be between 3 and 50 characters and contain only letters and spaces';
    }

    if (!editingEmail) {
      if (!form.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!EMAIL_REGEX.test(form.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!editingEmail) {
      if (!form.password) {
        newErrors.password = 'Password is required';
      } else if (!PASSWORD_REGEX.test(form.password)) {
        newErrors.password = 'Password must be between 6 and 50 characters';
      }
    } else {
      if (form.password && !PASSWORD_REGEX.test(form.password)) {
        newErrors.password = 'Password must be between 6 and 50 characters';
      }
    }

    if (form.mobile && !MOBILE_REGEX.test(form.mobile.trim())) {
      newErrors.mobile = 'Mobile number must be a valid 10-digit number (starting with 6-9)';
    }

    if (form.role === 'store' && !form.storeName.trim()) {
      newErrors.storeName = 'Store name is required';
    }

    setErrors(newErrors);

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();

    if (Object.keys(newErrors).length > 0) {
      toast({
        description: 'Please correct the errors in the form before submitting.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    setSubmitting(true);

    try {
      await onSubmitUser(form, !!editingEmail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex h-full min-h-0 flex-col overflow-hidden" noValidate onSubmit={handleSubmit}>
      <SheetBody className="px-6 py-5">
        <div className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <Input
              className={cn(errors.name && 'border-rose-500 focus-visible:ring-rose-500')}
              icon={User}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^A-Za-z\s]/g, '').slice(0, 50);
                setForm({ ...form, name: clean });

                if (errors.name) {
                  clearError('name');
                }
              }}
              placeholder="e.g. John Doe"
              value={form.name}
            />
            {errors.name && <p className="text-[10px] font-semibold text-rose-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <Input
              className={cn(errors.email && 'border-rose-500 focus-visible:ring-rose-500')}
              disabled={!!editingEmail}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });

                if (errors.email) {
                  clearError('email');
                }
              }}
              placeholder="e.g. user@example.com"
              type="email"
              value={form.email}
            />
            {errors.email && <p className="text-[10px] font-semibold text-rose-500">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">
              Password {!editingEmail && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
              <Input
                className={cn('pr-10', errors.password && 'border-rose-500 focus-visible:ring-rose-500')}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });

                  if (errors.password) {
                    clearError('password');
                  }
                }}
                placeholder={
                  editingEmail ? 'New password (leave blank to keep current)' : 'Password (min 6 characters)'
                }
                type={showPassword ? 'text' : 'password'}
                value={form.password}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-[10px] font-semibold text-rose-500">{errors.password}</p>}
          </div>

          {/* User Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">
              User Role <span className="text-rose-500">*</span>
            </label>
            <Select
              disabled={!!editingEmail}
              onChange={(e) => {
                const nextRole = e.target.value as UserRole;
                setForm((prev: UserFormData) => {
                  const next = { ...prev, role: nextRole };

                  if (nextRole !== 'store') {
                    next.storeName = '';
                  }

                  return next;
                });

                if (errors.storeName) {
                  clearError('storeName');
                }
              }}
              options={ROLE_OPTIONS}
              value={form.role}
            />
            {editingEmail && (
              <p className="text-[10px] font-medium italic text-muted-foreground">
                User role cannot be changed once created.
              </p>
            )}
          </div>

          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Mobile Number</label>
            <Input
              className={cn(errors.mobile && 'border-rose-500 focus-visible:ring-rose-500')}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setForm({ ...form, mobile: val });

                if (errors.mobile) {
                  clearError('mobile');
                }
              }}
              placeholder="10-digit mobile (optional)"
              value={form.mobile}
            />
            {errors.mobile && <p className="text-[10px] font-semibold text-rose-500">{errors.mobile}</p>}
          </div>

          {/* Store Name (conditional) */}
          {form.role === 'store' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">
                Store Name <span className="text-rose-500">*</span>
              </label>
              <Input
                className={cn(errors.storeName && 'border-rose-500 focus-visible:ring-rose-500')}
                icon={ShieldCheck}
                onChange={(e) => {
                  setForm({ ...form, storeName: e.target.value });

                  if (errors.storeName) {
                    clearError('storeName');
                  }
                }}
                placeholder="e.g. Apollo Store #104"
                value={form.storeName}
              />
              {errors.storeName && (
                <p className="text-[10px] font-semibold text-rose-500">{errors.storeName}</p>
              )}
            </div>
          )}
        </div>
      </SheetBody>

      <SheetFooter className="sticky bottom-0 bg-card px-6 py-4">
        <Button
          className="active:scale-98 h-10 w-full cursor-pointer rounded-md px-6 text-xs font-bold shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50"
          disabled={submitting}
          type="submit"
          variant="gradient"
        >
          {submitting ? 'Saving...' : editingEmail ? 'Save Changes' : 'Create User'}
        </Button>
      </SheetFooter>
    </form>
  );
}
