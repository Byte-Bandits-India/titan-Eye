import axios from 'axios';
import { Eye, EyeOff, KeyRound, Loader2, Mail } from 'lucide-react';
import * as React from 'react';

import { loginAction } from '../../Actions/authActions';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
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
      const err = e as Error;
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

  return (
    <div className="bg-radial relative flex min-h-[80vh] flex-1 items-center justify-center overflow-hidden from-slate-50 via-slate-100 to-slate-200 p-6 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[45vw] w-[45vw] rounded-full bg-blue-100/60 blur-3xl dark:bg-blue-950/20" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[45vw] w-[45vw] rounded-full bg-indigo-100/60 blur-3xl dark:bg-indigo-950/20" />

      <Card className="relative z-10 w-full max-w-md rounded-2xl border-white/50 bg-white/80 shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardHeader className="space-y-2 pb-4 text-center">
          <div className="mb-2 flex select-none items-center justify-center gap-1.5">
            <img alt="TITAN EYE+ Logo" height={150} src="/logo.png" width={150} />
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">Workspace Email</label>
              <Input
                autoComplete="email"
                icon={Mail}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store@gmail.com or optom@gmail.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">Security Password</label>
              <div className="relative">
                <Input
                  autoComplete="current-password"
                  className="pr-10"
                  icon={KeyRound}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              className="mt-2 h-11 w-full rounded-xl bg-teal-500 text-sm font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying Identity...
                </div>
              ) : (
                'Access Portal'
              )}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            className="h-11 w-full gap-2 rounded-xl text-sm font-semibold"
            onClick={handleMicrosoftSignIn}
            type="button"
            variant="outline"
          >
            <svg aria-hidden="true" height="16" viewBox="0 0 21 21" width="16">
              <rect fill="#f25022" height="9" width="9" x="1" y="1" />
              <rect fill="#7fba00" height="9" width="9" x="11" y="1" />
              <rect fill="#00a4ef" height="9" width="9" x="1" y="11" />
              <rect fill="#ffb900" height="9" width="9" x="11" y="11" />
            </svg>
            Sign in with Microsoft
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
