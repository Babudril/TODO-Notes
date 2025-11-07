import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { ArrowLeft } from 'lucide-react';
import { updatePassword } from '../utils/api';
import { createClient } from '../utils/supabase/client';

interface AccountSettingsProps {
  username: string;
  email: string;
  accessToken: string;
  onBack: () => void;
  onLogout: () => void;
  onTokenRefresh: (newToken: string) => void;
}

export function AccountSettings({ username, email, accessToken, onBack, onLogout, onTokenRefresh }: AccountSettingsProps) {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setLoading(true);

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError('Please fill in both password fields');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await updatePassword(accessToken, newPassword);
      
      // Refresh the session to get a new access token after password change
      const supabase = createClient();
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
        // Still show success since password was updated
        setPasswordSuccess('Password updated! Please log in again.');
        setTimeout(() => {
          handleLogout();
        }, 2000);
        return;
      }
      
      if (session?.access_token) {
        // Update the token in parent component
        onTokenRefresh(session.access_token);
      }
      
      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1>Account Settings</h1>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={username} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="bg-muted" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm mx-auto">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your new password below. It must be at least 6 characters long.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-2"
                    />
                  </div>
                  {passwordError && (
                    <div className="text-destructive text-center p-2 bg-destructive/10 rounded-md border">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="text-green-600 text-center p-2 bg-green-50 rounded-md border border-green-200">
                      {passwordSuccess}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsChangePasswordOpen(false);
                        setPasswordError('');
                        setPasswordSuccess('');
                      }}
                      className="flex-1"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="w-full"
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}