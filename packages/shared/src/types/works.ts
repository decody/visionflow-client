export type WorkRow = {
  id: number; // BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
  category: string; // TEXT NOT NULL
  industry: string; // TEXT NOT NULL
  roles: string[]; // TEXT[] NOT NULL
  title: string; // TEXT NOT NULL
  size: 'tall' | 'short'; // TEXT NOT NULL CHECK (size IN ('tall', 'short'))
  image?: string | null; // TEXT (nullable)
  link_url?: string | null; // TEXT (nullable)
  link_label?: string | null; // TEXT (nullable)
  created_at: string; // TIMESTAMPTZ NOT NULL
};

export type WorksData = WorkRow[];
