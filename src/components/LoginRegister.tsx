import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { createClient } from '../utils/supabase/client';
import { signUp } from '../utils/api';

interface LoginRegisterProps {
  onLogin: (username: string, accessToken: string, userId: string) => void;
}

export function LoginRegister({ onLogin }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login flow
        if (!email.trim() || !password.trim()) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }

        const supabase = createClient();
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          console.error('Login error:', loginError);
          setError(loginError.message);
          setLoading(false);
          return;
        }

        if (!data.session || !data.user) {
          setError('Login failed');
          setLoading(false);
          return;
        }

        const username = data.user.user_metadata?.username || email.split('@')[0];
        onLogin(username, data.session.access_token, data.user.id);
      } else {
        // Register flow
        if (!email.trim() || !password.trim() || !username.trim()) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        // Create user via API
        await signUp(email, password, username);

        // Now log them in
        const supabase = createClient();
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          console.error('Auto-login error after registration:', loginError);
          setError('Registration successful! Please log in.');
          setIsLogin(true);
          setLoading(false);
          return;
        }

        if (!data.session || !data.user) {
          setError('Registration successful! Please log in.');
          setIsLogin(true);
          setLoading(false);
          return;
        }

        onLogin(username, data.session.access_token, data.user.id);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-2">
        <CardHeader className="text-center">
          <CardTitle>{isLogin ? 'Login' : 'Register'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-6">
            <Button
              variant={isLogin ? "default" : "outline"}
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className="flex-1"
              disabled={loading}
            >
              Login
            </Button>
            <Button
              variant={!isLogin ? "default" : "outline"}
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              className="flex-1"
              disabled={loading}
            >
              Register
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-2"
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-2"
                disabled={loading}
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-2"
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <div className="text-destructive text-center p-2 bg-destructive/10 rounded-md border">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}