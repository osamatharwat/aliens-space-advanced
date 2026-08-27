import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Command,
  Compass,
  Database,
  ExternalLink,
  Fingerprint,
  GalleryHorizontalEnd,
  Globe2,
  Layers3,
  LockKeyhole,
  Menu,
  Network,
  Orbit,
  Radio,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { getPublicContent, type PublicContent } from "@/services/publicContent";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Committees", href: "#committees" },
  { label: "Events", href: "#events" },
  { label: "Stories", href: "#stories" },
];

const principles = [
  {
    icon: Fingerprint,
    number: "01",
    title: "Identity, not hierarchy theater",
    text: "Every role is relational, scoped, and earned through a traceable path—from account to membership to permission.",
  },
  {
    icon: Network,
    number: "02",
    title: "One system, many constellations",
    text: "Committees operate independently while sharing a common source of truth for people, work, and impact.",
  },
  {
    icon: ShieldCheck,
    number: "03",
    title: "Trust is a database feature",
    text: "Sensitive actions are enforced at the data boundary, with auditable transitions and private-by-default records.",
  },
];

function EmptyState({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="empty-state">
      <Database className="h-5 w-5 text-emerald-300" />
      <div>
        <p className="font-semibold text-white">{label}</p>
        <p className="mt-1 text-sm text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const auth = useSupabaseAuth();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNotice(null);
      setPassword("");
    }
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    try {
      if (mode === "login") {
        await auth.signIn(email, password);
        setNotice("Welcome back. Your Supabase session is active.");
      } else if (mode === "signup") {
        await auth.signUp(email, password, name);
        setNotice("Account created. Check your email if confirmation is enabled for this Supabase project.");
      } else {
        await auth.resetPassword(email);
        setNotice("If the address is registered, Supabase will send a password reset link.");
      }
    } catch {
      // The hook exposes the provider error below the form.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="auth-dialog border-white/10 bg-[#0a1120]/95 text-white shadow-2xl shadow-emerald-950/40 backdrop-blur-2xl sm:max-w-[460px]">
        <DialogHeader>
          <div className="mb-5 flex items-center gap-3">
            <div className="brand-mark small"><Orbit className="h-4 w-4" /></div>
            <span className="text-sm font-semibold tracking-[0.2em] text-emerald-200">ALIENS SPACE</span>
          </div>
          <DialogTitle className="font-display text-3xl tracking-tight">{mode === "login" ? "Return to orbit." : mode === "signup" ? "Claim your orbit." : "Reset access."}</DialogTitle>
          <DialogDescription className="text-slate-400">Supabase Auth keeps your account session secure and portable across visits.</DialogDescription>
        </DialogHeader>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="auth-name" className="text-slate-300">Full name</Label>
              <Input id="auth-name" required value={name} onChange={(event) => setName(event.target.value)} className="auth-input" autoComplete="name" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="auth-email" className="text-slate-300">Email</Label>
            <Input id="auth-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="auth-input" autoComplete="email" />
          </div>
          {mode !== "reset" && (
            <div className="space-y-2">
              <Label htmlFor="auth-password" className="text-slate-300">Password</Label>
              <Input id="auth-password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="auth-input" autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </div>
          )}
          {auth.error && <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{auth.error}</p>}
          {notice && <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">{notice}</p>}
          <Button type="submit" disabled={auth.loading} className="h-12 w-full rounded-xl bg-emerald-300 font-bold text-slate-950 hover:bg-emerald-200">
            {auth.loading ? "Connecting…" : mode === "login" ? "Enter the space" : mode === "signup" ? "Create account" : "Send reset link"}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          {mode === "login" ? (
            <>
              <button type="button" className="link-button" onClick={() => setMode("signup")}>Create an account</button>
              <button type="button" className="link-button" onClick={() => setMode("reset")}>Forgot password?</button>
            </>
          ) : (
            <button type="button" className="link-button" onClick={() => setMode("login")}>Back to sign in</button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <div className="section-heading">
      <div className="eyebrow"><span className="eyebrow-dot" />{eyebrow}</div>
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
  );
}

export default function Home() {
  const [content, setContent] = useState<PublicContent | null>(null);
  const [contentError, setContentError] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const auth = useSupabaseAuth();

  useEffect(() => {
    let active = true;
    getPublicContent()
      .then((result) => {
        if (active) setContent(result);
      })
      .catch(() => {
        if (active) setContentError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const events = useMemo(() => content?.events ?? [], [content]);
  const committees = useMemo(() => content?.committees ?? [], [content]);
  const members = useMemo(() => content?.members ?? [], [content]);
  const gallery = useMemo(() => content?.gallery ?? [], [content]);

  const openAuth = () => setAuthOpen(true);

  return (
    <div className="site-shell">
      <div className="space-grid" aria-hidden="true" />
      <div className="space-orb orb-one" aria-hidden="true" />
      <div className="space-orb orb-two" aria-hidden="true" />
      <div className="star-layer star-layer-one" aria-hidden="true" />
      <div className="star-layer star-layer-two" aria-hidden="true" />

      <header className="site-header">
        <div className="nav-wrap">
          <a href="#top" className="brand-lockup" aria-label="Aliens Space home">
            <span className="brand-mark"><Orbit className="h-5 w-5" /></span>
            <span>
              <span className="brand-name">ALIENS <span>SPACE</span></span>
              <span className="brand-subtitle">People beyond the ordinary</span>
            </span>
          </a>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
          <div className="nav-actions">
            {auth.isAuthenticated ? (
              <Link href="/profile" className="profile-chip"><CircleUserRound className="h-4 w-4" /><span>{auth.user?.user_metadata?.full_name || "Your profile"}</span></Link>
            ) : (
              <button type="button" className="text-button" onClick={openAuth}>Sign in</button>
            )}
            <Button type="button" onClick={openAuth} className="nav-cta">Join the movement <ArrowUpRight className="h-4 w-4" /></Button>
            <button type="button" aria-label="Toggle menu" className="mobile-menu-button" onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {mobileOpen && <div className="mobile-nav">{navItems.map((item) => <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>{item.label}<ChevronRight className="h-4 w-4" /></a>)}<button type="button" onClick={openAuth}>Sign in <ArrowUpRight className="h-4 w-4" /></button></div>}
      </header>

      <main id="top">
        <section className="hero-section content-width">
          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow"><span className="eyebrow-dot" />A space for uncommon people <span className="eyebrow-line" /></div>
            <h1>Make your mark<br /><span>in a bigger universe.</span></h1>
            <p className="hero-lede">Aliens Space is a living community for people who turn curiosity into momentum—across media, events, relationships, analysis, and the magic in between.</p>
            <div className="hero-actions">
              <a href="#committees" className="primary-action">Explore the committees <ArrowUpRight className="h-4 w-4" /></a>
              <a href="#about" className="secondary-action"><span className="play-orbit"><ChevronRight className="h-3 w-3" /></span>See how we work</a>
            </div>
            <div className="hero-proof"><div className="proof-line" /><span>Built by students. Designed for impact.</span></div>
          </div>
          <div className="hero-visual" aria-label="An abstract orbit illustration">
            <div className="hero-halo halo-one" /><div className="hero-halo halo-two" />
            <div className="orbit-ring ring-large" /><div className="orbit-ring ring-medium" /><div className="orbit-ring ring-small" />
            <div className="planet"><div className="planet-core" /><div className="planet-glow" /><span className="planet-label">THE<br />UNCOMMON</span></div>
            <div className="orbit-node node-one"><Sparkles className="h-3 w-3" /></div><div className="orbit-node node-two"><Radio className="h-3 w-3" /></div><div className="orbit-node node-three"><Compass className="h-3 w-3" /></div>
            <div className="visual-caption"><span className="caption-kicker">CURRENT SIGNAL</span><span>Curiosity → contribution</span></div>
          </div>
        </section>

        <section className="signal-strip" aria-label="Platform principles">
          <div className="content-width signal-grid"><div className="signal-intro"><span>THE SIGNAL</span><strong>One constellation.<br />Many ways in.</strong></div><div className="signal-item"><Layers3 className="h-5 w-5" /><span>Public voice<br /><b>Make an impression</b></span></div><div className="signal-item"><UsersRound className="h-5 w-5" /><span>Team operating system<br /><b>Make things happen</b></span></div><div className="signal-item"><LockKeyhole className="h-5 w-5" /><span>Secure by design<br /><b>Make trust visible</b></span></div></div>
        </section>

        <section id="about" className="content-width about-section section-pad">
          <div className="about-aside"><div className="vertical-index">ALIENS / 001</div><div className="about-mark"><Globe2 className="h-5 w-5" /><span>Not a club.<br />A launchpad.</span></div></div>
          <div className="about-main"><SectionLabel eyebrow="The idea" title="The best work happens between worlds." detail="A public-facing community and a private operating system, connected by the same commitment: give good people the structure to do meaningful things together." /><div className="principles-grid">{principles.map((item) => <article key={item.number} className="principle-card"><div className="principle-top"><span>{item.number}</span><item.icon className="h-5 w-5 text-emerald-300" /></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div>
        </section>

        <section id="committees" className="content-width section-pad committees-section">
          <div className="section-row"><SectionLabel eyebrow="Find your frequency" title="Nine doors into the same mission." detail="Explore the active committees, meet the people behind them, and find the kind of work that makes you forget to check the time." /><a href="#recruitment" className="inline-link">I want to join <ArrowUpRight className="h-4 w-4" /></a></div>
          {committees.length === 0 ? <EmptyState label="Public committees are waiting for their first transmission." detail={contentError ? "The public Supabase content query needs attention." : "Once published in Supabase, each committee will appear here."} /> : <div className="committee-grid">{committees.map((committee, index) => <article key={committee.id} className="committee-card"><div className="committee-index">0{index + 1}</div><div className="committee-icon"><Command className="h-5 w-5" /></div><div className="committee-card-content"><div className="card-kicker">{committee.slug}</div><h3>{committee.name}</h3><p>{committee.short_description || committee.public_description || "A committee with a clear mission and room to make it yours."}</p><a href="#recruitment" className="card-arrow" aria-label={`Join ${committee.name}`}><ArrowUpRight className="h-4 w-4" /></a></div></article>)}</div>}
        </section>

        <section id="events" className="content-width section-pad events-section">
          <div className="section-row"><SectionLabel eyebrow="In the atmosphere" title="Events with a pulse." detail="Workshops, gatherings, and moments worth showing up for. Public event listings are managed from the same Supabase source as the team dashboard." /><a href="#events" className="inline-link">View all events <ArrowUpRight className="h-4 w-4" /></a></div>
          {events.length === 0 ? <EmptyState label="No public events have been published yet." detail="The next signal will appear here when an authorized team member publishes an event." /> : <div className="events-grid">{events.map((event) => <article key={event.id} className="event-card"><div className="event-date"><span>{new Date(event.starts_at).toLocaleDateString(undefined, { month: "short" })}</span><strong>{new Date(event.starts_at).getDate()}</strong></div><div className="event-info"><div className="card-kicker">{event.category || "Gathering"}</div><h3>{event.title}</h3><p>{event.summary || "A new Aliens Space event is ready to be discovered."}</p><div className="event-meta"><span><CalendarDays className="h-3.5 w-3.5" />{new Date(event.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span><span>{event.location || "To be announced"}</span></div></div><a href="#register" className="event-link" aria-label={`Register for ${event.title}`}><ArrowUpRight className="h-4 w-4" /></a></article>)}</div>}
        </section>

        <section id="stories" className="content-width section-pad stories-section">
          <div className="stories-intro"><SectionLabel eyebrow="From the archive" title="Proof that good energy compounds." detail="A living gallery of what happens when people with different perspectives share a room, a brief, or a little bit of courage." /></div>
          {gallery.length === 0 ? <EmptyState label="The gallery is quiet for now." detail="Published media from the Supabase gallery will be shown here without placeholder content." /> : <div className="gallery-grid">{gallery.slice(0, 6).map((item, index) => <article key={item.id} className={`gallery-card gallery-card-${index + 1}`}>{item.object_url ? <img src={item.object_url} alt={item.title} /> : <div className="gallery-placeholder"><GalleryHorizontalEnd className="h-6 w-6" /></div>}<div className="gallery-overlay"><span>{item.caption || "Aliens Space story"}</span><strong>{item.title}</strong></div></article>)}</div>}
        </section>

        <section id="recruitment" className="content-width recruitment-section">
          <div className="recruitment-card"><div className="recruitment-glow" /><div className="recruitment-copy"><div className="eyebrow"><span className="eyebrow-dot" />Open transmission</div><h2>There is more than one way to belong.</h2><p>Whether you are exploring your first role or returning with a new idea, the next chapter begins with a good question.</p><a href="/recruitment" className="primary-action">Start your application <ArrowUpRight className="h-4 w-4" /></a></div><div className="recruitment-side"><div className="side-orbit"><Orbit className="h-8 w-8" /></div><span>Applications are reviewed through a scoped, auditable process.</span><div className="side-check"><Check className="h-4 w-4" />No role is chosen on your behalf.</div><div className="side-check"><Check className="h-4 w-4" />Every answer stays attached to its moment.</div></div></div>
        </section>

        <section className="content-width member-signal section-pad"><div className="member-signal-copy"><div className="eyebrow"><span className="eyebrow-dot" />The people layer</div><h2>Names matter.<br /><span>Context matters more.</span></h2><p>Public member profiles show only what has been approved for public view. Everything sensitive stays where it belongs: inside the right scope.</p><a href="/committees" className="inline-link">Meet the public directory <ArrowUpRight className="h-4 w-4" /></a></div><div className="member-list">{members.length === 0 ? <EmptyState label="The public directory is empty." detail="Approved member profiles will appear here when published." /> : members.slice(0, 5).map((member) => <div className="member-row" key={member.id}>{member.avatar_url ? <img src={member.avatar_url} alt="" /> : <div className="member-avatar"><CircleUserRound className="h-5 w-5" /></div>}<div><strong>{member.name}</strong><span>{member.public_position || member.committee_name || "Aliens Space member"}</span></div><ArrowUpRight className="ml-auto h-4 w-4 text-slate-500" /></div>)}</div></section>
      </main>

      <footer className="site-footer"><div className="content-width footer-grid"><div><a href="#top" className="brand-lockup"><span className="brand-mark small"><Orbit className="h-4 w-4" /></span><span className="brand-name">ALIENS <span>SPACE</span></span></a><p className="footer-note">A space for uncommon people<br />to build something that lasts.</p></div><div className="footer-links"><div><span>Explore</span><a href="#about">About</a><a href="#committees">Committees</a><a href="#events">Events</a></div><div><span>For members</span><a href="/profile">Your profile</a><a href="/workspace">Workspace</a><a href="/dashboard">Command center</a></div><div><span>Trust</span><a href="/verify">Verify certificate</a><a href="#top">Privacy boundary</a><a href="#top">Contact</a></div></div></div><div className="content-width footer-bottom"><span>© {new Date().getFullYear()} Aliens Space</span><span>Built with curiosity, guarded by design.</span></div></footer>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
