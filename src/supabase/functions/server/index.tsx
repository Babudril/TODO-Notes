import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-d4e26c79/health", (c) => {
  return c.json({ status: "ok" });
});

// ============ AUTH ENDPOINTS ============

// Sign up endpoint
app.post("/make-server-d4e26c79/signup", async (c) => {
  try {
    const { email, password, username } = await c.req.json();

    if (!email || !password || !username) {
      return c.json({ error: "Email, password, and username are required" }, 400);
    }

    // Create user with Supabase Auth
    // Automatically confirm the user's email since an email server hasn't been configured.
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: true
    });

    if (error) {
      console.log(`Auth error during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    if (!data.user) {
      return c.json({ error: "Failed to create user" }, 500);
    }

    // Store user profile in KV store
    await kv.set(`user:${data.user.id}:profile`, {
      userId: data.user.id,
      username,
      email,
      createdAt: new Date().toISOString()
    });

    return c.json({ 
      message: "User created successfully",
      userId: data.user.id,
      username
    });
  } catch (error) {
    console.log(`Server error during signup: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Login endpoint (using Supabase client directly from frontend)
// This endpoint is optional but provided for consistency
app.post("/make-server-d4e26c79/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    // Note: For login, the frontend should use Supabase client directly
    // This endpoint is just for reference
    return c.json({ 
      message: "Please use Supabase client for login on the frontend" 
    });
  } catch (error) {
    console.log(`Server error during login: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get user profile
app.get("/make-server-d4e26c79/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized: No token provided" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      console.log(`Authorization error while getting profile: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`user:${user.id}:profile`);
    
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.log(`Server error while getting profile: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update password
app.post("/make-server-d4e26c79/profile/password", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized: No token provided" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.log(`Authorization error while updating password: ${authError?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { newPassword } = await c.req.json();

    if (!newPassword || newPassword.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    const { error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (error) {
      console.log(`Error updating password: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: "Password updated successfully" });
  } catch (error) {
    console.log(`Server error while updating password: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============ NOTES ENDPOINTS ============

// Get all notes for a user
app.get("/make-server-d4e26c79/notes", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized: No token provided" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      console.log(`Authorization error while getting notes: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get all notes for this user
    const notesData = await kv.getByPrefix(`user:${user.id}:note:`);
    console.log(`Raw notes data from KV store:`, notesData);
    
    // Filter out any null or invalid values
    // Note: getByPrefix already returns just the values, not objects with .value property
    const notes = notesData.filter(note => 
      note && typeof note === 'object' && note.id && note.title
    );

    console.log(`Retrieved ${notes.length} notes for user ${user.id}`);
    return c.json({ notes });
  } catch (error) {
    console.log(`Server error while getting notes: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Create a new note
app.post("/make-server-d4e26c79/notes", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized: No token provided" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.log(`Authorization error while creating note: ${authError?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { title, text, tags, deadline } = await c.req.json();

    if (!title) {
      return c.json({ error: "Title is required" }, 400);
    }

    if (!deadline) {
      return c.json({ error: "Deadline is required" }, 400);
    }

    const noteId = crypto.randomUUID();
    const note = {
      id: noteId,
      userId: user.id,
      title: title || '',
      text: text || '',
      tags: tags || [],
      deadline: deadline,
      createdAt: new Date().toISOString()
    };

    console.log(`Creating note for user ${user.id}:`, JSON.stringify(note));
    console.log(`KV key will be: user:${user.id}:note:${noteId}`);
    
    await kv.set(`user:${user.id}:note:${noteId}`, note);
    console.log(`Note created successfully with ID: ${noteId}`);
    
    // Verify it was saved
    const savedNote = await kv.get(`user:${user.id}:note:${noteId}`);
    console.log(`Verification - saved note:`, JSON.stringify(savedNote));

    return c.json({ note });
  } catch (error) {
    console.log(`Server error while creating note: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update a note
app.put("/make-server-d4e26c79/notes/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized: No token provided" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.log(`Authorization error while updating note: ${authError?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const noteId = c.req.param('id');
    const { title, text, tags, deadline } = await c.req.json();

    // Get existing note to verify ownership and preserve createdAt
    const existingNote = await kv.get(`user:${user.id}:note:${noteId}`);
    
    if (!existingNote) {
      return c.json({ error: "Note not found" }, 404);
    }

    const updatedNote = {
      ...existingNote,
      title,
      text,
      tags: tags || [],
      deadline: deadline || null
    };

    await kv.set(`user:${user.id}:note:${noteId}`, updatedNote);

    return c.json({ note: updatedNote });
  } catch (error) {
    console.log(`Server error while updating note: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete a note
app.delete("/make-server-d4e26c79/notes/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized: No token provided" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.log(`Authorization error while deleting note: ${authError?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const noteId = c.req.param('id');

    // Verify note exists before deleting
    const existingNote = await kv.get(`user:${user.id}:note:${noteId}`);
    
    if (!existingNote) {
      return c.json({ error: "Note not found" }, 404);
    }

    await kv.del(`user:${user.id}:note:${noteId}`);

    return c.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.log(`Server error while deleting note: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

Deno.serve(app.fetch);