import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '@/models/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/app/inbox" replace />;
  }

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      await register(username, email, password);
      navigate('/app/inbox');
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      const message = axiosError.response?.data?.message ?? axiosError.message ?? 'Sign-up failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Enter your information to create an account</CardDescription>
          <CardAction>
            <Link to="/" className="text-sm font-medium text-foreground hover:underline">
              Log in
            </Link>
          </CardAction>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-username" className="text-sm font-medium text-foreground">
                Username
              </Label>
              <Input
                id="register-username"
                className="bg-background"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                className="bg-background"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                id="register-password"
                type="password"
                className="bg-background"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="button" onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
