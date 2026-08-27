import { supabase } from "@/lib/supabase";

export type PublicCommittee = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  public_description: string | null;
  accent: string | null;
};

export type PublicEvent = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  category: string | null;
  capacity: number | null;
  registration_closes_at: string | null;
  certificate_enabled: boolean;
};

export type PublicMember = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  public_position: string | null;
  committee_name: string | null;
};

export type PublicMedia = {
  id: string;
  title: string;
  caption: string | null;
  object_url: string | null;
  published_at: string | null;
};

export type PublicContent = {
  committees: PublicCommittee[];
  events: PublicEvent[];
  members: PublicMember[];
  gallery: PublicMedia[];
  projects: PublicMedia[];
  achievements: PublicMedia[];
  partners: PublicMedia[];
};

async function readTable<T>(table: string, query: (builder: any) => any): Promise<T[]> {
  const { data, error } = await query(supabase.from(table));
  if (error) {
    // An empty database or an uncreated optional content table is an empty state, not seed data.
    console.warn(`[Supabase] Unable to read ${table}: ${error.message}`);
    return [];
  }
  return (data ?? []) as T[];
}

export async function getPublicContent(): Promise<PublicContent> {
  const [committees, events, members, gallery, projects, achievements, partners] = await Promise.all([
    readTable<PublicCommittee>("committees", (builder) => builder.select("id,name,slug,short_description,public_description,accent").eq("is_public", true).order("sort_order")),
    readTable<PublicEvent>("events", (builder) => builder.select("id,title,slug,summary,starts_at,ends_at,registration_closes_at,location,category,capacity,certificate_enabled").eq("is_published", true).order("starts_at", { ascending: true }).limit(6)),
    readTable<PublicMember>("public_members", (builder) => builder.select("id,name,username,avatar_url,public_position,committee_name").order("name").limit(12)),
    readTable<PublicMedia>("gallery_media", (builder) => builder.select("id,title,caption,object_url,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(9)),
    readTable<PublicMedia>("projects", (builder) => builder.select("id,title,caption,object_url,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(6)),
    readTable<PublicMedia>("achievements", (builder) => builder.select("id,title,caption,object_url,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(6)),
    readTable<PublicMedia>("partners", (builder) => builder.select("id,title,caption,object_url,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(12)),
  ]);

  return { committees, events, members, gallery, projects, achievements, partners };
}

export async function verifyCertificate(code: string) {
  const { data, error } = await supabase.rpc("verify_certificate_public", { p_verification_code: code.trim() });
  if (error) throw error;
  return data as { valid: boolean; recipient_name?: string; event_title?: string; event_date?: string; signatory_name?: string; signatory_title?: string } | null;
}
