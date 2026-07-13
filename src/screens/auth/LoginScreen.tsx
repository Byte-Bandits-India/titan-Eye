import * as React from 'react';
import axios from 'axios';
import { KeyRound, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { useAppDispatch, useAppSelector } from '../../store';
import { loginAction } from '../../Actions/authActions';
import { API_BASE_URL } from '../../options/Option';

const SSO_ERROR_MESSAGES: Record<string, string> = {
  not_provisioned: 'No account found for your Microsoft email. Ask your admin to create one first.',
  inactive: 'This account has been deactivated.',
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
        title: 'Sign-in Failed',
        description: SSO_ERROR_MESSAGES[error] || 'Something went wrong signing you in.',
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
        title: 'Validation Error',
        description: 'Please fill in all credentials.',
        type: 'error',
      });
      return;
    }

    try {
      await dispatch(loginAction(email, password));
      toast({
        title: 'Success',
        description: `Logged in successfully.`,
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
        title: 'Authentication Failed',
        description: errorMessage,
        type: 'error',
      });
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh] p-6 relative overflow-hidden bg-radial from-slate-50 via-slate-100 to-slate-200 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-blue-100/60 dark:bg-blue-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-indigo-100/60 dark:bg-indigo-950/20 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-white/50 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="flex items-center justify-center gap-1.5 mb-2 select-none">
            <img src="/logo.png" alt="TITAN EYE+ Logo" width={150} height={150} />
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">
                Workspace Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store@gmail.com or optum@gmail.com"
                icon={Mail}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">
                Security Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={KeyRound}
                  autoComplete="current-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 h-11 bg-teal-500 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white font-semibold rounded-xl text-sm"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Identity...
                </div>
              ) : (
                'Access Portal'
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleMicrosoftSignIn}
            className="w-full h-11 rounded-xl text-sm font-semibold gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
