import axios from 'axios';
import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import * as React from 'react';

import { loginAction } from '../../Actions/authActions';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../options/Option';
import { useAppDispatch, useAppSelector } from '../../store';

const SSO_ERROR_MESSAGES: Record<string, string> = {
  inactive: 'This account has been deactivated.',
  not_provisioned: 'No account found for your Microsoft email. Ask your admin to create one first.',
  sso_failed: 'Microsoft sign-in failed. Please try again.',
};

export function LoginScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);

  const dispatch = useAppDispatch();
  const { loading: isLoading } = useAppSelector((state) => state.auth);
  const { toast } = useToast();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    if (error) {
      toast({
        description: SSO_ERROR_MESSAGES[error] || 'Something went wrong signing you in.',
        title: 'Sign-in Failed',
        type: 'error',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMicrosoftSignIn = () => {
    window.location.href = `${API_BASE_URL}/auth/microsoft/login`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        description: 'Please fill in all credentials.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    try {
      await dispatch(loginAction(email, password));
      toast({
        description: `Logged in successfully.`,
        title: 'Success',
        type: 'success',
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      let errorMessage = 'Invalid email or password.';

      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as { error?: string };
        errorMessage = data.error || errorMessage;
      } else {
        errorMessage = err.message || errorMessage;
      }

      toast({
        description: errorMessage,
        title: 'Authentication Failed',
        type: 'error',
      });
    }
  };

  const inputClasses = cn(
    'h-12 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900',
    'outline-none transition-colors placeholder:text-gray-400',
    'focus:border-gray-400 focus:ring-1 focus:ring-gray-400'
  );

  return (
    <div className="animated-gradient-bg flex min-h-screen w-full items-center justify-center p-6">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
        {/* Left poster image */}
        <div className="hidden flex-1 lg:block">
          <img alt="What is Myopia?" className="h-full w-full object-cover" src="/images/login.png" />
        </div>

        {/* Right sign-in panel */}
        <div className="flex w-full flex-1 flex-col justify-center px-8 py-10 sm:px-12 sm:py-14">
          <div className="mb-8 flex flex-col items-center text-center">
            <p className="mb-2 text-sm text-gray-500">Welcome to</p>
            <img alt="TITAN EYE+" className="h-auto w-40" src="/images/logo-black.png" />
            <p className="mt-2 text-xs font-medium tracking-[0.2em] text-gray-500">REMOTE EYE TESTING</p>
            <div className="mt-3 h-0.5 w-10 rounded-full bg-teal-600" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="login-email">
                User ID
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  autoComplete="email"
                  className={inputClasses}
                  id="login-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter User ID"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  autoComplete="current-password"
                  className={cn(inputClasses, 'pr-11')}
                  id="login-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-gray-500">
                <input
                  checked={rememberMe}
                  className="h-4 w-4 rounded border-gray-300 accent-teal-600"
                  onChange={(e) => setRememberMe(e.target.checked)}
                  type="checkbox"
                />
                Remember me
              </label>
            </div>

            <button
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 text-base font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium uppercase text-gray-400">or continue with</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            onClick={handleMicrosoftSignIn}
            type="button"
          >
            <svg aria-hidden="true" height="18" viewBox="0 0 21 21" width="18">
              <rect fill="#f25022" height="9" width="9" x="1" y="1" />
              <rect fill="#7fba00" height="9" width="9" x="11" y="1" />
              <rect fill="#00a4ef" height="9" width="9" x="1" y="11" />
              <rect fill="#ffb900" height="9" width="9" x="11" y="11" />
            </svg>
            Continue with Microsoft
          </button>
        </div>
      </div>
    </div>
  );
}
