import * as React from 'react';
import { KeyRound, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent } from './ui/card';
import { Input } from './ui/input';
import { useToast } from './ui/toast';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

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

    setIsLoading(true);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

    try {
      const response = await fetch(`${apiBaseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      setIsLoading(false);

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: `Logged in as ${data.user.name} successfully.`,
          type: 'success',
        });
        onLoginSuccess(data.user);
      } else {
        const data = await response.json().catch(() => ({}));
        toast({
          title: 'Authentication Failed',
          description: data.error || 'Invalid email or password.',
          type: 'error',
        });
      }
    } catch (err) {
      setIsLoading(false);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to the authentication server.',
        type: 'error',
      });
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh] p-6 relative overflow-hidden bg-radial from-slate-50 via-slate-100 to-slate-200">
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-white bg-white/80 backdrop-blur-md rounded-2xl">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="flex items-center justify-center gap-1.5 mb-2 select-none">
            <img src="/logo.png" alt="TITAN EYE+ Logo" width={150} height={150} />
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 block">Workspace Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store@gmail.com or optem@gmail.com"
                icon={Mail}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 block">Security Password</label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 h-11 bg-teal-500 hover:bg-teal-800 text-white font-semibold rounded-xl text-sm"
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

        </CardContent>
      </Card>
    </div>
  );
}
