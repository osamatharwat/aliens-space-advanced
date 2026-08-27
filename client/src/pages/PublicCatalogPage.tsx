import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Database, GalleryHorizontalEnd, Loader2, Orbit, UsersRound } from "lucide-react";
import { getPublicContent, type PublicContent } from "@/services/publicContent";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function EmptyCatalog({ title, detail }: { title: string; detail: string }) {
  return <div className="portal-empty"><Database className="h-6 w-6 text-emerald-300" /><div><h2>{title}</h2><p>{detail}</p></div></div>;
}

function RegistrationDialog({ event, open, onOpenChange }: { event: any | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const auth = useSupabaseAuth();
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!event) return;
    setError(null); setStatus(null); setTicket(null);
    const response = auth.user
      ? await supabase.rpc("register_event_authenticated", { p_event_id: event.id })
      : await supabase.rpc("register_event_guest", { p_event_id: event.id, p_guest_name: guest.name, p_guest_email: guest.email, p_guest_phone: guest.phone });
    if (response.error) setError(response.error.message);
    else {
      const result = Array.isArray(response.data) ? response.data[0] : response.data;
      setTicket(result?.ticket_code ?? null);
      setStatus("Registration confirmed in Supabase.");
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="auth-dialog border-white/10 bg-[#0a1120]/95 text-white shadow-2xl shadow-emerald-950/40 backdrop-blur-2xl sm:max-w-[500px]"><DialogHeader><DialogTitle className="font-display text-2xl">{event?.title}</DialogTitle><DialogDescription className="text-slate-400">Registration is checked atomically against event status, capacity, and duplicate constraints.</DialogDescription></DialogHeader><form className="mt-4 space-y-4" onSubmit={submit}>{!auth.user && <div className="form-grid"><div className="field"><Label htmlFor="guest-name">Name</Label><Input id="guest-name" required value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} /></div><div className="field"><Label htmlFor="guest-email">Email</Label><Input id="guest-email" type="email" required value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} /></div><div className="field"><Label htmlFor="guest-phone">Phone</Label><Input id="guest-phone" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} /></div></div>}{status && <p className="success-note">{status}{ticket && <> Keep your guest ticket code: <strong>{ticket}</strong></>}</p>}{error && <p className="error-note">{error}</p>}<Button type="submit" disabled={Boolean(status)} className="w-full bg-emerald-300 text-slate-950 hover:bg-emerald-200">{status ? <><CheckCircle2 className="mr-2 h-4 w-4" />Registered</> : <>{auth.user ? "Confirm registration" : "Register as guest"}<ArrowUpRight className="ml-2 h-4 w-4" /></>}</Button></form></DialogContent></Dialog>;
}

export default function PublicCatalogPage() {
  const [location] = useLocation();
  const [content, setContent] = useState<PublicContent | null>(null);
  const [error, setError] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  useEffect(() => { getPublicContent().then(setContent).catch(() => setError(true)); }, []);
  const section = useMemo(() => {
    const path = location.replace(/^\//, "").split("/")[0];
    const map: Record<string, { title: string; eyebrow: string; detail: string }> = {
      committees: { title: "Nine doors into the same mission.", eyebrow: "Committees", detail: "Public committee information comes from the same Supabase source that powers private membership scope." },
      events: { title: "Events with a pulse.", eyebrow: "Events", detail: "Published events are visible here and actionable from their secure registration flow." },
      gallery: { title: "Proof that good energy compounds.", eyebrow: "Gallery", detail: "Only explicitly published media is exposed to the public surface." },
      projects: { title: "Ideas that became real.", eyebrow: "Projects", detail: "Published projects and achievements, with no placeholder records." },
      members: { title: "Meet the people in orbit.", eyebrow: "Public directory", detail: "Only approved public profile information is rendered here." },
      partners: { title: "Build the next orbit with us.", eyebrow: "Partners", detail: "Published partners are read from the Supabase content catalog and never invented in the client." },
      about: { title: "A space for uncommon people.", eyebrow: "About Aliens Space", detail: "The public story is curated through published Supabase content records." },
      pr: { title: "Stories worth sending outward.", eyebrow: "PR & media", detail: "Public relations content stays editorially controlled and database-backed." },
    };
    return map[path] ?? map.committees;
  }, [location]);

  const path = location.replace(/^\//, "").split("/")[0];
  const rows = path === "about" || path === "pr" ? (content?.siteContent ?? []).filter((item) => item.content_key === path || item.content_key.startsWith(`${path}.`)) : path === "partners" ? content?.partners ?? [] : path === "events" ? content?.events ?? [] : path === "gallery" ? content?.gallery ?? [] : path === "projects" ? [...(content?.projects ?? []), ...(content?.achievements ?? [])] : path === "members" ? content?.members ?? [] : content?.committees ?? [];
  const isEvents = location.startsWith("/events");
  return <div className="portal-shell"><header className="portal-header"><Link href="/" className="brand-lockup"><span className="brand-mark small"><Orbit className="h-4 w-4" /></span><span className="brand-name">ALIENS <span>SPACE</span></span></Link><Link href="/" className="back-link">Back to public space <ArrowUpRight className="h-4 w-4" /></Link></header><main className="content-width portal-main"><Link href="/" className="back-link"><ArrowLeft className="h-4 w-4" />Back to home</Link><div className="portal-heading"><div className="eyebrow"><span className="eyebrow-dot" />{section.eyebrow}</div><h1>{section.title}</h1><p>{section.detail}</p></div>{error ? <EmptyCatalog title="The public signal is unavailable." detail="The Supabase content query returned an error. No local fallback was used." /> : rows.length === 0 ? <EmptyCatalog title="Nothing has been published here yet." detail="This view stays empty until an authorized team member publishes records in Supabase." /> : <div className="catalog-grid">{rows.map((item: any) => { const title = item.title || item.name; const description = item.caption || item.short_description || item.public_description || item.summary || item.body; const isEvent = "starts_at" in item; const isMember = "username" in item; return <article className="catalog-card" key={item.id}>{item.object_url ? <img src={item.object_url} alt={title} /> : <div className="catalog-icon">{isEvent ? <CalendarDays className="h-5 w-5" /> : isMember ? <UsersRound className="h-5 w-5" /> : <GalleryHorizontalEnd className="h-5 w-5" />}</div>}<div className="catalog-body"><span className="card-kicker">{isEvent ? new Date(item.starts_at).toLocaleDateString() : item.slug || item.public_position || "Aliens Space"}</span><h2>{title}</h2><p>{description || "Published information from the Aliens Space database."}</p>{isEvent && <Button type="button" onClick={() => setSelectedEvent(item)} className="mt-5 w-fit bg-emerald-300 text-slate-950 hover:bg-emerald-200">Register <ArrowUpRight className="ml-2 h-4 w-4" /></Button>}</div></article>; })}</div>}<RegistrationDialog event={isEvents ? selectedEvent : null} open={Boolean(selectedEvent)} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }} /></main></div>;
}
