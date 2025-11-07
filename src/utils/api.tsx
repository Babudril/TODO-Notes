import { projectId, publicAnonKey } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d4e26c79`;

export interface NoteData {
  id: string;
  userId: string;
  title: string;
  text: string;
  tags: string[];
  deadline: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  createdAt: string;
}

async function fetchAPI(
  endpoint: string, 
  options: RequestInit = {},
  useAuth: boolean = false,
  accessToken?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (useAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (!useAuth) {
    headers['Authorization'] = `Bearer ${publicAnonKey}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`API: Making ${options.method || 'GET'} request to ${url}`);
  console.log(`API: Using auth:`, useAuth, 'Token present:', !!accessToken);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log(`API: Response status for ${endpoint}:`, response.status);
  
  const data = await response.json();
  console.log(`API: Response data for ${endpoint}:`, data);

  if (!response.ok) {
    console.error(`API error for ${endpoint}:`, data.error || data);
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Auth APIs
export async function signUp(email: string, password: string, username: string) {
  return fetchAPI('/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  });
}

// Profile APIs
export async function getProfile(accessToken: string): Promise<{ profile: UserProfile }> {
  return fetchAPI('/profile', {}, true, accessToken);
}

export async function updatePassword(accessToken: string, newPassword: string) {
  return fetchAPI('/profile/password', {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  }, true, accessToken);
}

// Notes APIs
export async function getNotes(accessToken: string): Promise<{ notes: NoteData[] }> {
  console.log('Fetching notes with access token:', accessToken ? 'present' : 'missing');
  const result = await fetchAPI('/notes', {}, true, accessToken);
  console.log('Notes fetch result:', result);
  return result;
}

export async function createNote(
  accessToken: string, 
  noteData: { title: string; text: string; tags: string[]; deadline: string }
): Promise<{ note: NoteData }> {
  return fetchAPI('/notes', {
    method: 'POST',
    body: JSON.stringify(noteData),
  }, true, accessToken);
}

export async function updateNote(
  accessToken: string,
  noteId: string,
  noteData: { title: string; text: string; tags: string[]; deadline: string }
): Promise<{ note: NoteData }> {
  return fetchAPI(`/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify(noteData),
  }, true, accessToken);
}

export async function deleteNote(accessToken: string, noteId: string) {
  return fetchAPI(`/notes/${noteId}`, {
    method: 'DELETE',
  }, true, accessToken);
}
