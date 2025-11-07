import React, { useState, useEffect } from 'react';
import { LoginRegister } from './components/LoginRegister';
import { MainPage } from './components/MainPage';
import { NoteEditor } from './components/NoteEditor';
import { AccountSettings } from './components/AccountSettings';
import { NoteType } from './components/Note';
import { createClient } from './utils/supabase/client';
import { getProfile } from './utils/api';

type Screen = 'login' | 'main' | 'noteEditor' | 'accountSettings';

interface UserData {
  username: string;
  email: string;
  userId: string;
  accessToken: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [user, setUser] = useState<UserData | null>(null);
  const [editingNote, setEditingNote] = useState<NoteType | null>(null);
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainPageKey, setMainPageKey] = useState(0);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user) {
          const { profile } = await getProfile(session.access_token);
          setUser({
            username: profile.username,
            email: profile.email,
            userId: session.user.id,
            accessToken: session.access_token
          });
          setCurrentScreen('main');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = (username: string, accessToken: string, userId: string) => {
    // We need to get the email from the session
    const supabase = createClient();
    supabase.auth.getUser(accessToken).then(({ data }) => {
      if (data.user) {
        setUser({
          username,
          email: data.user.email || '',
          userId,
          accessToken
        });
        setCurrentScreen('main');
      }
    });
  };

  const handleLogout = () => {
    setUser(null);
    setNotes([]);
    setCurrentScreen('login');
    setEditingNote(null);
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setCurrentScreen('noteEditor');
  };

  const handleEditNote = (note: NoteType) => {
    setEditingNote(note);
    setCurrentScreen('noteEditor');
  };

  const handleSaveNote = () => {
    // Return to main page and force refetch by changing key
    setMainPageKey(prev => prev + 1);
    setCurrentScreen('main');
    setEditingNote(null);
  };

  const handleCancelEdit = () => {
    setCurrentScreen('main');
    setEditingNote(null);
  };

  const handleNotesUpdate = (updatedNotes: NoteType[]) => {
    setNotes(updatedNotes);
  };

  const handleTokenRefresh = (newToken: string) => {
    if (user) {
      setUser({
        ...user,
        accessToken: newToken
      });
    }
  };

  const renderCurrentScreen = () => {
    if (loading) {
      return (
        <div className="size-full flex items-center justify-center">
          <div className="text-center">Loading...</div>
        </div>
      );
    }

    switch (currentScreen) {
      case 'login':
        return <LoginRegister onLogin={handleLogin} />;
      
      case 'main':
        return user ? (
          <MainPage
            key={mainPageKey}
            username={user.username}
            accessToken={user.accessToken}
            onNoteClick={handleEditNote}
            onCreateNote={handleCreateNote}
            onAvatarClick={() => setCurrentScreen('accountSettings')}
            onNotesUpdate={handleNotesUpdate}
          />
        ) : null;
      
      case 'noteEditor':
        return user ? (
          <NoteEditor
            note={editingNote || undefined}
            accessToken={user.accessToken}
            onSave={handleSaveNote}
            onCancel={handleCancelEdit}
          />
        ) : null;
      
      case 'accountSettings':
        return user ? (
          <AccountSettings
            username={user.username}
            email={user.email}
            accessToken={user.accessToken}
            onBack={() => setCurrentScreen('main')}
            onLogout={handleLogout}
            onTokenRefresh={handleTokenRefresh}
          />
        ) : null;
      
      default:
        return <LoginRegister onLogin={handleLogin} />;
    }
  };

  return (
    <div className="size-full">
      {renderCurrentScreen()}
    </div>
  );
}