import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileBadge2,
  FolderLock,
  KeyRound,
  Loader2,
  LogOut,
  Orbit,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase, updatePassword } from "@/lib/supabase";
import { getPublicContent, verifyCertificate, type PublicCommittee, type PublicEvent } from "@/services/publicContent";
import { claimGuestCertificate, redeemCommitteeAccessCode, submitApplication } from "@/services/operations";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabaseAccess } from "@/hooks/useSupabaseAccess";

function ScopeNav() {
  const access = useSupabaseAccess();
  if (access.loading || access.navItems.length === 0) return null;
  return <nav className="scope-nav" aria-label="Your authorized spaces">{access.navItems.map((item) => <Link href={item.href} key={item.href} className="scope-nav-link"><span>{item.label}</span><small>{item.scope}</small></Link>)}</nav>;
}

function PortalShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const auth = useSupabaseAuth();
  const [, setLocation] = useLocation();
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <Link href="/" className="brand-lockup"><span className="brand-mark small"><Orbit className="h-4 w-4" /></span><span className="brand-name">ALIENS <span>SPACE</span></span></Link>
        <div className="portal-user"><span>{auth.user?.email || "Authenticated space"}</span><button type="button" onClick={async () => { await auth.signOut(); setLocation("/"); }} aria-label="Sign out"><LogOut className="h-4 w-4" /></button></div>
      </header>
      <main className="content-width portal-main">
        <Link href="/" className="back-link"><ArrowLeft className="h-4 w-4" />Back to public space</Link>
        <ScopeNav />
        <div className="portal-heading"><div className="eyebrow"><span className="eyebrow-dot" />{eyebrow}</div><h1>{title}</h1></div>
        {children}
      </main>
    </div>
  );
}

function AuthRequired({ message = "This private layer is available after sign in." }: { message?: string }) {
  const [, setLocation] = useLocation();
  return <div className="portal-empty"><ShieldCheck className="h-7 w-7 text-emerald-300" /><div><h2>Private by design.</h2><p>{message}</p><Button className="mt-5 bg-emerald-300 text-slate-950 hover:bg-emerald-200" onClick={() => setLocation("/")}>Return to sign in <ArrowUpRight className="ml-2 h-4 w-4" /></Button></div></div>;
}

export function ProfilePage() {
  const auth = useSupabaseAuth();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.user) return;
    supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle().then(({ data, error: queryError }) => {
      if (queryError) setError(queryError.message);
      else setProfile(data);
    });
  }, [auth.user]);

  if (auth.loading) return <div className="portal-loading"><Loader2 className="animate-spin" />Restoring your Supabase session…</div>;
  if (!auth.isAuthenticated) return <PortalShell title="Your profile" eyebrow="Identity layer"><AuthRequired /></PortalShell>;

  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    setNotice(null); setError(null);
    const { data, error: updateError } = await supabase.from("profiles").update({ name: profile.name, username: profile.username, phone: profile.phone, faculty: profile.faculty, academic_level: profile.academic_level }).eq("id", auth.user!.id).select().single();
    if (updateError) setError(updateError.message); else { setProfile(data); setNotice("Profile updated in Supabase."); }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth.user) return;
    setNotice(null); setError(null);
    const objectKey = `${auth.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(objectKey, file, { upsert: false, contentType: file.type });
    if (uploadError) { setError(uploadError.message); return; }
    const { data: signed } = await supabase.storage.from("profile-avatars").createSignedUrl(objectKey, 60 * 60 * 24 * 30);
    const { error: updateError } = await supabase.from("profiles").update({ avatar_object_key: objectKey, avatar_url: signed?.signedUrl ?? null }).eq("id", auth.user.id);
    if (updateError) setError(updateError.message); else { setProfile((value) => ({ ...(value ?? {}), avatar_object_key: objectKey, avatar_url: signed?.signedUrl ?? null })); setNotice("Avatar uploaded and linked to your profile."); }
  };

  return <PortalShell title="Your profile" eyebrow="Identity layer"><div className="portal-grid profile-grid"><section className="portal-card"><div className="portal-card-heading"><div><span className="card-kicker">Authoritative profile</span><h2>Make it yours.</h2></div><div className="profile-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <UsersRound className="h-6 w-6" />}</div></div><div className="upload-control"><Upload className="h-4 w-4" /><span>Upload avatar</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} /></div><form className="form-grid" onSubmit={update}>{[["name", "Name"], ["username", "Username"], ["phone", "Phone"], ["faculty", "Faculty"], ["academic_level", "Academic level"]].map(([key, label]) => <div className="field" key={key}><Label htmlFor={`profile-${key}`}>{label}</Label><Input id={`profile-${key}`} value={profile?.[key] ?? ""} onChange={(event) => setProfile((value) => ({ ...(value ?? {}), [key]: event.target.value }))} /></div>)}<div className="field"><Label>Email</Label><Input value={auth.user?.email ?? ""} disabled /></div><Button type="submit" className="bg-emerald-300 text-slate-950 hover:bg-emerald-200">Save profile <CheckCircle2 className="ml-2 h-4 w-4" /></Button></form>{notice && <p className="success-note">{notice}</p>}{error && <p className="error-note">{error}</p>}</section><section className="portal-card muted-card"><span className="card-kicker">Account boundary</span><h2>Registered user ≠ team member.</h2><p>Your account is the identity layer. Committee membership, position, board status, evaluator eligibility, and permissions are separate relational records—never inferred from profile text.</p><div className="boundary-row"><FolderLock className="h-4 w-4" /><span>Private fields stay outside public profiles.</span></div><div className="boundary-row"><KeyRound className="h-4 w-4" /><span>Activation happens through a database-enforced access code.</span></div><Link href="/workspace" className="text-link">Open your workspace <ArrowUpRight className="h-4 w-4" /></Link></section><CertificateList /></div></PortalShell>;
}

export function WorkspacePage() {
  const auth = useSupabaseAuth();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    if (!auth.user) return;
    const { data } = await supabase.from("committee_memberships").select("id,status,position,committee:committees(name,slug)").eq("user_id", auth.user.id).eq("status", "active");
    setMemberships(data ?? []);
  };
  useEffect(() => { load(); }, [auth.user]);
  if (auth.loading) return <div className="portal-loading"><Loader2 className="animate-spin" />Restoring your Supabase session…</div>;
  if (!auth.isAuthenticated) return <PortalShell title="Workspace" eyebrow="Team operating system"><AuthRequired message="Redeem a valid committee access code only after creating your account." /></PortalShell>;
  const redeem = async (event: FormEvent) => { event.preventDefault(); setNotice(null); setError(null); let data: any = null; let rpcError: any = null; try { data = await redeemCommitteeAccessCode(code); } catch (reason: any) { rpcError = reason; } if (rpcError) setError(rpcError.message); else { setCode(""); setNotice("Access code accepted. Membership was determined by Supabase."); await load(); } };
  return <PortalShell title="Your workspace" eyebrow="Team operating system"><div className="workspace-top"><div><span className="card-kicker">Scope-aware access</span><h2>Work only where you belong.</h2><p>Every committee, task, resource, and announcement is filtered by the membership returned from Supabase.</p></div><form className="code-form" onSubmit={redeem}><Label htmlFor="access-code">Committee access code</Label><div><Input id="access-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter a code" required /><Button type="submit" className="bg-emerald-300 text-slate-950 hover:bg-emerald-200"><KeyRound className="mr-2 h-4 w-4" />Redeem</Button></div></form></div>{notice && <p className="success-note">{notice}</p>}{error && <p className="error-note">{error}</p>}<div className="portal-grid workspace-grid">{memberships.length === 0 ? <div className="portal-empty span-full"><Database className="h-6 w-6 text-emerald-300" /><div><h2>No active committee membership.</h2><p>Registered accounts see no operational workspace until the atomic access-code flow creates an active membership.</p></div></div> : memberships.map((membership) => <section key={membership.id} className="portal-card"><div className="committee-icon"><Orbit className="h-5 w-5" /></div><span className="card-kicker">{membership.committee?.slug}</span><h2>{membership.committee?.name}</h2><Badge className="role-badge">{membership.position}</Badge><div className="workspace-links"><span><ClipboardCheck className="h-4 w-4" />Tasks</span><span><FolderLock className="h-4 w-4" />Resources</span><span><UsersRound className="h-4 w-4" />Members</span></div></section>)}</div></PortalShell>;
}

export function RecruitmentPage() {
  const auth = useSupabaseAuth();
  const [committees, setCommittees] = useState<PublicCommittee[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [committeeId, setCommitteeId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getPublicContent().then(({ committees: result }) => setCommittees(result)); supabase.from("questions").select("id,prompt,help_text,category,committee_id").eq("is_enabled", true).order("sort_order").then(({ data }) => setQuestions(data ?? [])); }, []);
  const visibleQuestions = useMemo(() => questions.filter((question) => question.category !== "committee" || !committeeId || question.committee_id === committeeId), [questions, committeeId]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setStatus(null); setError(null); const payload = visibleQuestions.map((question) => ({ question_id: question.id, answer: answers[question.id] ?? "" })); try { await submitApplication({ userId: auth.user?.id ?? null, guestName: auth.user ? undefined : form.name, guestEmail: auth.user ? undefined : form.email, guestPhone: auth.user ? undefined : form.phone, committeeId, answers: payload }); setStatus("Application received. The scoped review workflow now owns the next step."); } catch (reason: any) { setError(reason.message); } };
  return <div className="portal-shell"><header className="portal-header"><Link href="/" className="brand-lockup"><span className="brand-mark small"><Orbit className="h-4 w-4" /></span><span className="brand-name">ALIENS <span>SPACE</span></span></Link><span className="portal-user">{auth.isAuthenticated ? `Signed in as ${auth.user?.email}` : "Public recruitment"}</span></header><main className="content-width portal-main"><Link href="/" className="back-link"><ArrowLeft className="h-4 w-4" />Back to public space</Link><div className="portal-heading"><div className="eyebrow"><span className="eyebrow-dot" />Open transmission</div><h1>Start with a good question.</h1><p>Applications are stored in Supabase with immutable question snapshots, then reviewed within the correct scope.</p></div><form className="application-form" onSubmit={submit}><section className="portal-card"><span className="card-kicker">01 / Destination</span><h2>Where do you want to contribute?</h2><div className="field"><Label htmlFor="committee">Committee</Label><select id="committee" value={committeeId} onChange={(event) => setCommitteeId(event.target.value)}><option value="">Choose a committee</option>{committees.map((committee) => <option key={committee.id} value={committee.id}>{committee.name}</option>)}</select></div>{!auth.isAuthenticated && <div className="form-grid"><div className="field"><Label htmlFor="app-name">Name</Label><Input id="app-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="field"><Label htmlFor="app-email">Email</Label><Input id="app-email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div className="field"><Label htmlFor="app-phone">Phone</Label><Input id="app-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div></div>}</section><section className="portal-card"><span className="card-kicker">02 / Questions from Supabase</span><h2>Tell us how you think.</h2>{visibleQuestions.length === 0 ? <div className="inline-empty"><Database className="h-5 w-5" /><span>No enabled questions are published for this selection yet.</span></div> : visibleQuestions.map((question) => <div className="question-field" key={question.id}><Label htmlFor={`question-${question.id}`}>{question.prompt}</Label>{question.help_text && <p>{question.help_text}</p>}<Textarea id={`question-${question.id}`} required value={answers[question.id] ?? ""} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} /></div>)}</section>{status && <p className="success-note">{status}</p>}{error && <p className="error-note">{error}</p>}<Button type="submit" className="h-12 w-fit bg-emerald-300 px-6 text-slate-950 hover:bg-emerald-200">Submit application <ArrowUpRight className="ml-2 h-4 w-4" /></Button></form></main></div>;
}

export function VerifyPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); setError(null); setResult(null); try { setResult(await verifyCertificate(code)); } catch (reason: any) { setError(reason.message); } finally { setLoading(false); } };
  return <div className="portal-shell"><header className="portal-header"><Link href="/" className="brand-lockup"><span className="brand-mark small"><Orbit className="h-4 w-4" /></span><span className="brand-name">ALIENS <span>SPACE</span></span></Link><Link href="/" className="back-link">Back to public space <ArrowUpRight className="h-4 w-4" /></Link></header><main className="content-width portal-main verify-main"><div className="verify-icon"><FileBadge2 className="h-7 w-7" /></div><div className="portal-heading"><div className="eyebrow"><span className="eyebrow-dot" />Public verification</div><h1>Is this certificate real?</h1><p>Enter the immutable verification code. Public verification exposes only the minimum facts needed to confirm authenticity.</p></div><form className="verify-form" onSubmit={submit}><Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. 4F91D8A0C2B3" required /><Button type="submit" disabled={loading} className="bg-emerald-300 text-slate-950 hover:bg-emerald-200">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Verify</Button></form>{error && <p className="error-note">{error}</p>}{result && <div className={`verification-result ${result.valid ? "valid" : "invalid"}`}>{result.valid ? <CheckCircle2 className="h-6 w-6" /> : <RefreshCw className="h-6 w-6" />}<div><span className="card-kicker">{result.valid ? "Verified certificate" : "No matching certificate"}</span>{result.valid && <><h2>{result.recipient_name}</h2><p>{result.event_title} · {result.event_date}</p><p>{result.signatory_name} · {result.signatory_title}</p></>}</div></div>}</main></div>;
}

export function DashboardPage() {
  const auth = useSupabaseAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!auth.user) return; setLoading(true); Promise.all(["applications", "events", "committee_memberships", "certificates"].map(async (table) => { const { count } = await supabase.from(table).select("id", { count: "exact", head: true }); return [table, count ?? 0] as const; })).then((values) => setCounts(Object.fromEntries(values))).finally(() => setLoading(false)); }, [auth.user]);
  if (auth.loading) return <div className="portal-loading"><Loader2 className="animate-spin" />Restoring your Supabase session…</div>;
  if (!auth.isAuthenticated) return <PortalShell title="Command center" eyebrow="Restricted operations"><AuthRequired /></PortalShell>;
  const metrics = [{ key: "applications", label: "Applications", icon: ClipboardCheck }, { key: "events", label: "Events", icon: Orbit }, { key: "committee_memberships", label: "Memberships", icon: UsersRound }, { key: "certificates", label: "Certificates", icon: FileBadge2 }];
  return <PortalShell title="Command center" eyebrow="Restricted operations"><div className="dashboard-banner"><div><span className="card-kicker">Live Supabase view</span><h2>Operational truth, without theater.</h2><p>These counts are read from the connected database. Empty or unavailable tables are shown as empty—not simulated.</p></div><Badge className="live-badge">{loading ? "SYNCING" : "CONNECTED"}</Badge></div><div className="metric-grid">{metrics.map(({ key, label, icon: Icon }) => <div className="metric-card" key={key}><Icon className="h-5 w-5 text-emerald-300" /><span>{label}</span><strong>{counts[key] ?? 0}</strong></div>)}</div><div className="dashboard-modules"><Link href="/workspace" className="portal-card module-card"><KeyRound className="h-5 w-5 text-emerald-300" /><h3>Membership & access</h3><p>Activate and inspect your scope through database-enforced flows.</p><ArrowUpRight className="module-arrow h-4 w-4" /></Link><div className="portal-card module-card"><Database className="h-5 w-5 text-emerald-300" /><h3>Operational modules</h3><p>Applications, IR, events, attendance, certificates, and exports are structured for scoped procedures.</p><span className="module-note">Connect the canonical migration to unlock live actions.</span></div></div></PortalShell>;
}

export function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || password !== confirm) { setError("Use at least 8 characters and make both passwords match."); return; }
    setError(null);
    try { await updatePassword(password); setStatus("Password updated. Your Supabase session remains active."); setTimeout(() => setLocation("/profile"), 900); } catch (reason: any) { setError(reason.message); }
  };
  return <div className="portal-shell"><header className="portal-header"><Link href="/" className="brand-lockup"><span className="brand-mark small"><Orbit className="h-4 w-4" /></span><span className="brand-name">ALIENS <span>SPACE</span></span></Link></header><main className="content-width portal-main verify-main"><div className="verify-icon"><KeyRound className="h-7 w-7" /></div><div className="portal-heading"><div className="eyebrow"><span className="eyebrow-dot" />Account recovery</div><h1>Choose a new key.</h1><p>Supabase Auth will update your password without exposing it to the application database.</p></div><form className="portal-card reset-form" onSubmit={submit}><div className="field"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></div><div className="field"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></div>{status && <p className="success-note">{status}</p>}{error && <p className="error-note">{error}</p>}<Button type="submit" className="bg-emerald-300 text-slate-950 hover:bg-emerald-200">Update password <ArrowUpRight className="ml-2 h-4 w-4" /></Button></form></main></div>;
}

function CertificateList() {
  const auth = useSupabaseAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!auth.user) return;
    supabase.from("certificates").select("id,event_title,event_date,verification_code,file_object_key").order("event_date", { ascending: false }).then(({ data, error: queryError }) => {
      if (queryError) setError(queryError.message); else setCertificates(data ?? []);
    });
  }, [auth.user]);
  const openFile = async (certificate: any) => {
    if (!certificate.file_object_key) { setError("This certificate has no generated file yet."); return; }
    const { data, error: signedError } = await supabase.storage.from("certificate-files").createSignedUrl(certificate.file_object_key, 60 * 15);
    if (signedError || !data?.signedUrl) { setError(signedError?.message ?? "Unable to open certificate file."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return <section className="portal-card certificates-card"><div className="portal-card-heading"><div><span className="card-kicker">Member dashboard</span><h2>My certificates.</h2></div><FileBadge2 className="h-6 w-6 text-emerald-300" /></div>{error && <p className="error-note">{error}</p>}{certificates.length === 0 ? <div className="inline-empty"><Database className="h-5 w-5" /><span>Your completed event certificates will persist here after authorized issuance.</span></div> : <div className="certificate-list">{certificates.map((certificate) => <div className="certificate-row" key={certificate.id}><div><strong>{certificate.event_title}</strong><span>{new Date(certificate.event_date).toLocaleDateString()} · {certificate.verification_code}</span></div><div className="certificate-actions"><button type="button" onClick={() => openFile(certificate)}>View</button><button type="button" onClick={() => openFile(certificate)}>Download</button><button type="button" onClick={() => openFile(certificate)}>Print</button></div></div>)}</div>}</section>;
}

export function GuestCertificatePage() {
  const [ticket, setTicket] = useState("");
  const [certificate, setCertificate] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const claim = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null); setCertificate(null);
    try { setCertificate(await claimGuestCertificate(ticket)); } catch (reason: any) { setError(reason.message); } finally { setLoading(false); }
  };
  const openFile = async () => {
    if (!certificate?.file_object_key) { setError("The certificate file has not been generated yet."); return; }
    const { data, error: signedError } = await supabase.storage.from("certificate-files").createSignedUrl(certificate.file_object_key, 60 * 15);
    if (signedError || !data?.signedUrl) setError(signedError?.message ?? "Unable to open certificate file."); else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return <div className="portal-shell"><header className="portal-header"><Link href="/" className="brand-lockup"><span className="brand-mark small"><Orbit className="h-4 w-4" /></span><span className="brand-name">ALIENS <span>SPACE</span></span></Link><Link href="/verify" className="back-link">Public verification <ArrowUpRight className="h-4 w-4" /></Link></header><main className="content-width portal-main verify-main"><div className="verify-icon"><FileBadge2 className="h-7 w-7" /></div><div className="portal-heading"><div className="eyebrow"><span className="eyebrow-dot" />Guest access</div><h1>Claim your certificate.</h1><p>Use the private ticket code you received after registration. It is checked against attendance and issuance state inside Supabase.</p></div><form className="verify-form" onSubmit={claim}><Input value={ticket} onChange={(event) => setTicket(event.target.value)} placeholder="Paste your guest ticket code" required /><Button type="submit" disabled={loading} className="bg-emerald-300 text-slate-950 hover:bg-emerald-200">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Claim</Button></form>{error && <p className="error-note">{error}</p>}{certificate && <div className="verification-result valid"><CheckCircle2 className="h-6 w-6" /><div><span className="card-kicker">Certificate ready</span><h2>{certificate.recipient_name}</h2><p>{certificate.event_title} · {new Date(certificate.event_date).toLocaleDateString()}</p><Button type="button" onClick={openFile} className="mt-4 bg-emerald-300 text-slate-950 hover:bg-emerald-200">Open certificate file <ArrowUpRight className="ml-2 h-4 w-4" /></Button></div></div>}</main></div>;
}
