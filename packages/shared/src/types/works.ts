export type WorkRow = {
  id: string | number; // UUID in the current Supabase schema
  category: string; // TEXT NOT NULL
  industry: string; // TEXT NOT NULL
  roles: string[]; // UI-normalized from the current Supabase TEXT column
  title: string; // TEXT NOT NULL
  size: 'tall' | 'short' | string; // TEXT NOT NULL
  image?: string | null; // TEXT (nullable)
  isImportant?: boolean; // BOOLEAN, camelCased by apiClient from is_important
  is_important?: boolean; // Optional fallback for raw Supabase responses
  link_url?: string | null; // TEXT (nullable)
  link_label?: string | null; // TEXT (nullable)
  created_at: string; // TIMESTAMPTZ NOT NULL
};

export type WorksData = WorkRow[];
