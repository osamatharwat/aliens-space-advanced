# ALIENS SPACE 2.0 — تقرير إعادة بناء وتقوية قاعدة البيانات

**الحالة:** تقرير ملفات SQL فقط — الواجهة مجمّدة عمدًا، ولم يتم تنفيذ SQL على Supabase الحي في هذه المرحلة.

> هذا التقرير يصف ما تم إنتاجه في ملفات المشروع، وليس دليلًا على أن المشروع الحي يطابقها. الوصول read-only إلى REST أعاد `401`، وموصلا Supabase غير مفعّلين في الجلسة؛ لذلك كل حقيقة تخص الحالة الحية مصنفة **UNVERIFIED**.

## A. الملخص التنفيذي

أُنتجت بنية PostgreSQL/Supabase قانونية تعتمد UUID، وتربط `auth.users` بـ`profiles` ثم العضويات واللجان، مع جداول التوظيف وIR والأحداث والشهادات والمهام والإشعارات وسجل التدقيق. أُضيفت قيود علاقات وفهارس وRLS وRPCs ذات `SECURITY DEFINER` و`search_path = public`، وقواعد board membership، وإعادة تعيين IR، وتسجيل إشعار queued عند التحويل.

تم إنشاء ملف schema نهائي وملف migration غير هدّام. لم تُحذف بيانات، ولم يُنشأ مستخدم OG hardcoded، ولم يتم توصيل الواجهة بهذه النسخة الجديدة. لا يجوز اعتبار قاعدة البيانات جاهزة للإنتاج قبل تطبيق الملفين في مشروع Supabase مستهدف ثم تنفيذ استعلامات التحقق وحالات اختبار بحسابات غير إنتاجية.

## B. جرد قاعدة البيانات من الملفات

الجرد التالي **ساكن** من `supabase/ALIENS_FINAL_DATABASE.sql`، وليس جردًا حيًا.

| العنصر | العدد/الحالة من الملف | التقييم الحي |
|---|---:|---|
| جداول `public` | 36 | UNVERIFIED |
| أنواع enum | 9، منها `certificate_status` و`event_attendance_status` | UNVERIFIED |
| دوال `public` | 48 تعريفًا/إعادة تعريف | UNVERIFIED |
| سياسات RLS | 39، منها سياسات Storage في `storage.objects` | UNVERIFIED |
| triggers | 19 | UNVERIFIED |
| UUID primary keys | مطبق على الجداول التشغيلية | UNVERIFIED |
| storage buckets | 5 مذكورة: `public-assets`, `avatars`, `gallery`, `private-files`, `certificates` | UNVERIFIED |
| row counts | لا يمكن قراءتها من الملفات | UNVERIFIED |

الجداول الكنسية هي: `profiles`, `user_roles`, `permissions`, `role_permissions`, `committees`, `committee_memberships`, `board_memberships`, `committee_access_codes`, `access_code_redemptions`, `site_settings`, `site_content`, `questions`, `applications`, `application_answers`, `application_reviews`, `application_shifts`, `ir_evaluator_eligibility`, `ir_assignments`, `evaluations`, `events`, `event_registrations`, `event_attendance`, `certificates`, `certificate_claims`, `gallery_albums`, `gallery_media`, `projects`, `achievements`, `memories`, `warnings`, `partners`, `committee_tasks`, `committee_resources`, `committee_announcements`, `notifications`, و`audit_logs`.

## C. خريطة العلاقات

```text
auth.users
  └── profiles
       ├── user_roles → role_permissions → permissions
       ├── committee_memberships → committees
       │                              ├── committee_tasks
       │                              ├── committee_resources
       │                              └── committee_announcements
       ├── applications → application_answers → questions
       │                 ├── application_reviews
       │                 └── application_shifts → notifications
       ├── ir_evaluator_eligibility → ir_assignments → evaluations
       └── event_registrations → events
                              ├── event_attendance
                              └── certificates → certificate_claims
```

المرجع السلطوي للعضوية والدور والموقع هو الجداول العلاقية، وليس نصوصًا مكررة داخل profile. حقلا `avatar_object_key` و`file_object_key` مراجع كائنات فقط، وليسا محتوى ملفات.

## D. مصفوفة DATABASE ↔ CODE

| Entity | Canonical table | Frontend/service | RPC أو القراءة | RLS/FK | الحالة |
|---|---|---|---|---|---|
| Profiles | `profiles` | `supabase.ts`, `PortalPages` | `update_public_profile`, direct self read | self/public policies, auth FK | PARTIAL / live UNVERIFIED |
| Committees | `committees` | `publicContent`, workspace | direct public read | public/scoped | PARTIAL / live UNVERIFIED |
| Memberships | `committee_memberships` | `useSupabaseAccess`, Workspace | `redeem_committee_access_code` | scoped read | PARTIAL / live UNVERIFIED |
| Roles | `user_roles` | access hook | role helpers | role-scoped | UNVERIFIED live |
| Access codes | `committee_access_codes` | operations | redeem RPC | no client insert path | UNVERIFIED live |
| Redemptions | `access_code_redemptions` | operations | redeem RPC | unique `(access_code_id,user_id)` | UNVERIFIED live |
| Questions | `questions` | Recruitment | create/update/delete/reorder/preview RPCs | category/committee check | UNVERIFIED live |
| Applications | `applications` | Recruitment/operations | submit/review/delete/shift/export | scoped | UNVERIFIED live |
| Answers | `application_answers` | Recruitment payload | submit RPC | immutable snapshot columns | UNVERIFIED live |
| Reviews | `application_reviews` | operation wrapper | review RPC | reviewer/scope | UNVERIFIED live |
| Shifts | `application_shifts` | operation wrapper | shift RPC | old/new FK and actor auth.uid | UNVERIFIED live |
| IR eligibility | `ir_evaluator_eligibility` | operation wrapper | set eligibility | max capacity check = 30 | UNVERIFIED live |
| IR assignments | `ir_assignments` | operation wrapper | assign/unassign/reassign | one active member index | UNVERIFIED live |
| Evaluations | `evaluations` | operation wrapper | save evaluation | assigned/committee/leadership logic | UNVERIFIED live |
| Events | `events` | PublicCatalog/operations | create/update/publish/delete/WhatsApp | committee scope | UNVERIFIED live |
| Registrations | `event_registrations` | PublicCatalog | authenticated/guest RPCs | duplicate/capacity indexes | UNVERIFIED live |
| Attendance | `event_attendance` | operations | mark attendance | registration FK | UNVERIFIED live |
| Certificates | `certificates` | PortalPages | issue/verify/claim | one per registration, unique code | PARTIAL: file generation UNVERIFIED |
| Claims | `certificate_claims` | GuestCertificatePage | claim RPC | mutually exclusive user/ticket | UNVERIFIED live |
| Tasks | `committee_tasks` | Workspace/operations | create/update/delete/complete | committee scoped | UNVERIFIED live |
| Resources | `committee_resources` | Workspace/operations | create/delete | committee scoped/storage ref | UNVERIFIED live |
| Announcements | `committee_announcements` | Workspace/operations | create | committee scoped | UNVERIFIED live |
| Notifications | `notifications` | server WhatsApp processor | shift enqueue + processor | recipient/leadership | UNVERIFIED live |
| Audit logs | `audit_logs` | no public UI | triggers/RPCs | OG read | UNVERIFIED live |
| Warnings | `warnings` | no current UI | schema only | sensitive | UNVERIFIED live |
| Settings | `site_settings` | certificate logic | direct settings read | public read only for site settings | UNVERIFIED live |
| Gallery/memories | `gallery_media`, `memories` | public catalog / schema | published reads | public only when published | UNVERIFIED live |
| Analytics | aggregate RPC | Dashboard | `get_analytics_summary`, `export_analytics` | authenticated | UNVERIFIED live |

## E. التناقضات والمخاطر المعروفة

| الملف/الموضع | المتوقع | الموجود | الإجراء المطلوب |
|---|---|---|---|
| `supabase/ALIENS_FINAL_DATABASE.sql` مقابل المشروع الحي | schema final مطبق | لا يوجد دليل وصول حي؛ REST أعاد 401 | تفعيل موصل Supabase ثم تطبيق الملف والتحقق |
| `event_attendance` | الاسم الكنسي الجديد | الواجهة القديمة في بعض المسارات قد تشير إلى `attendance` | لا توصل الواجهة قبل تحديث contract types واختبار القراءة |
| `certificates` | record + file حقيقي | schema يحتوي `file_object_key`، لكن `issue_certificate` لا ينشئ ملفًا فعليًا | إضافة Edge Function/server file renderer قبل production |
| `site_settings` | signatory admin-controlled | إصدار الشهادة يفشل إذا لم يوجد signatory، وهذا صحيح؛ لكن live configuration غير معروف | إدخال signatory عبر عملية admin مضبوطة ثم اختبار issuance |
| `memories` و`warnings` | كيانان مطلوبان | أُضيفا إلى schema النهائي، ولا توجد واجهة تشغيل حالية | تنفيذ طبقة الإدارة لاحقًا فقط بعد DB verification |
| public About/PR | محتوى منشور | يعتمد على `site_content.content_key`; عدم وجود rows يعرض empty state | إدخال محتوى حقيقي عبر مسار OG بعد تطبيق schema |
| WhatsApp | queued/sent/failed | enqueue موجود في shift وprocessor server-side؛ provider غير موصل | اختبار provider لاحقًا دون claim delivery |

## F. SUPABASE-ONLY GAP LIST

لا توجد row counts أو أسماء وظائف أو سياسات أو buckets حية يمكن اعتمادها في هذه الجلسة. لا يمكن إثبات migration status أو وجود Data Analysis أو غياب جداول legacy من REST بعد `401`. كما لا يمكن اختبار race conditions أو RLS cross-scope أو signup/email confirmation أو Storage policies.

## G. RLS SECURITY MATRIX

| المجال | القراءة | الكتابة | مستوى الخطر قبل live verification |
|---|---|---|---|
| Profiles | public view عند `is_public`; self profile | self/RPC | HIGH until applied/tested |
| Roles/memberships | self/scoped/OG | controlled RPCs | CRITICAL until live-tested |
| Access codes | لا قراءة عامة | redeem RPC فقط | CRITICAL until live-tested |
| Applications/answers | owner أو scope | secure submission/review RPC | HIGH until live-tested |
| IR assignments/evaluations | assigned/IR/leadership/OG | protected RPC | HIGH until live-tested |
| Registrations/attendance | owner أو event scope | registration/attendance RPC | HIGH until live-tested |
| Certificates | owner/claim/verify RPC | issue RPC | HIGH until live-tested |
| Tasks/resources/announcements | committee scope | scoped policies/RPCs | MEDIUM until live-tested |
| Audit logs | OG read | triggers/RPC only | CRITICAL until live-tested |
| Notifications | recipient/leadership | server workflow | HIGH until live-tested |

يجب رفض أي سياسة حساسة تستخدم `USING(true)` أو `WITH CHECK(true)`. الاستثناء المقصود في الملف هو قراءة `site_settings` العامة، وهي تحتاج مراجعة وظيفية قبل اعتمادها كسياسة إنتاج.

## H. RPC SECURITY MATRIX

| RPC family | auth.uid | scope/role | SECURITY DEFINER + search_path | transaction/race concern | الحالة |
|---|---|---|---|---|---|
| Access-code redemption | نعم | committee + position من code hash | نعم في الملف | row lock/unique redemption | UNVERIFIED live |
| Registration | نعم للمستخدم؛ guest للضيف | event public/open | نعم | unique indexes + capacity query | UNVERIFIED live |
| Attendance | نعم | event committee/global leadership | نعم | upsert attendance | UNVERIFIED live |
| Certificate issue | نعم | OG/team leadership | نعم | attended + signatory + one-per-registration | PARTIAL: file output unverified |
| Shift | نعم | source committee/OG | نعم | application lock + history + notification | UNVERIFIED live |
| IR assign/reassign | نعم | IR head/sub-head/OG | نعم | capacity and active-assignment constraints | UNVERIFIED live |
| Evaluation | نعم | assigned, own committee, team, OG | نعم | row permissions | UNVERIFIED live |
| Event CRUD | نعم | committee/global event scope | نعم | FK and event state | UNVERIFIED live |
| Question CRUD | نعم | category-specific role/scope | نعم | question snapshot preserved | UNVERIFIED live |

لا تعتمد RPCs على `actor_id` يرسله العميل؛ الملفات تستخدم `auth.uid()` داخل الدوال الحرجة. يجب تأكيد ذلك فعليًا بعد التطبيق عبر `authenticated` test users.

## I. تدقيق المصادقة

المسار المقصود هو `auth.users → profiles` عبر trigger `on_auth_user_created`، ثم `committee_memberships → committees → role helpers → scope-aware navigation/dashboard`. التسجيل والدخول والخروج وإعادة تعيين كلمة المرور موجودة في client Supabase Auth، مع `persistSession` وPKCE. لا يوجد OG email hardcoded في schema الجديد.

الحالة: **الكود موجود؛ سلوك Auth الحي، trigger profile creation، confirmation mode، redirect URLs، وsession persistence في المتصفح UNVERIFIED**. لا يوجد قرار صالح لإرجاع username/password؛ كلمات المرور لا تُستخرج من Supabase.

## J. التوظيف والأسئلة وIR

الإجابة السلطوية هي صفوف `application_answers` مع `question_text_snapshot` و`question_category`، وليس JSONB dynamic answers. التعديل أو الحذف اللاحق للسؤال لا يغير snapshot التاريخي. تتضمن الملفات RPCs للإنشاء والتعديل والحذف والترتيب والتفعيل والمعاينة.

IR evaluator منفصل عن IR head/sub-head. الحد هو 30 عبر check constraint، وهناك unique partial index لمهمة نشطة واحدة لكل member. أُضيف `reassign_ir_member` مع إلغاء assignment السابق وإنشاء تاريخ جديد. كل ذلك **UNVERIFIED live**، ولا توجد بيانات حقيقية مقاسة في هذه الجلسة.

## K. الأحداث والحضور والشهادات

العلاقة الكنسية هي `events → event_registrations → event_attendance → certificates`. registration status هو `confirmed/cancelled`، والحضور هو `attended/not_attended`. certificate issuance يشترط event certificate enabled والحضور attended وsignatory configured، ويمنع duplicate registration certificate.

الـschema الجديد يحتوي `event_id`, `user_id`, `status`, `certificate_template`, و`file_object_key`. لكن إصدار شهادة فعلي قابل للتنزيل يتطلب renderer أو Edge Function يكتب ملفًا إلى private `certificates`; وجود الحقل لا يساوي وجود الملف. لذلك بند **actual certificate file = UNVERIFIED / NOT IMPLEMENTED in this database-only step**.

## L. التحويل وWhatsApp

`shift_application` يأخذ actor من `auth.uid()`، يحفظ old/new committee في history، ويضيف notification بحالة `queued` عندما يكون للمستخدم profile. `server/services/whatsapp.ts` يعالج queued إلى sent أو failed أو deferred عند غياب provider credentials. لا يمكن إثبات provider delivery أو retry أو provider message ID حيًا. التصنيف الحالي: **PARTIALLY IMPLEMENTED / QUEUED AND SERVER PROCESSOR AVAILABLE; FULLY CONNECTED = UNVERIFIED**.

## M. اللجان وData Analysis

ملف migration يضيف قاموس اللجان التسع فقط عند غيابها، بما فيها `Data Analysis`; لا يضيف أعضاء أو رؤساء أو محتوى تجريبي. Data Analysis لجنة حقيقية بنيويًا وليست OG/Admin تلقائيًا. وجود الصفوف الحية، heads/sub-heads، access codes، questions، workspace، tasks، وanalytics permissions كلها **UNVERIFIED** حتى تنفيذ migration والتحقق.

## N. Trigger matrix

| Trigger | Table/event | Function | Purpose | Static status | Live status |
|---|---|---|---|---|---|
| `on_auth_user_created` | `auth.users` / AFTER INSERT | `sync_profile_from_auth` | إنشاء profile authoritative | PRESENT | UNVERIFIED |
| `committee_board_rule` | `committee_memberships` / BEFORE INSERT OR UPDATE | `enforce_board_rule` | Head/Sub Head → board membership | PRESENT | UNVERIFIED |
| `profiles_touch` | `profiles` / BEFORE UPDATE | `touch_updated_at` | تحديث timestamp | PRESENT | UNVERIFIED |
| `committees_touch` | `committees` / BEFORE UPDATE | `touch_updated_at` | تحديث timestamp | PRESENT | UNVERIFIED |
| `memberships_touch` | `committee_memberships` / BEFORE UPDATE | `touch_updated_at` | تحديث timestamp | PRESENT | UNVERIFIED |
| `events_touch` | `events` / BEFORE UPDATE | `touch_updated_at` | تحديث timestamp | PRESENT | UNVERIFIED |
| `tasks_touch` | `committee_tasks` / BEFORE UPDATE | `touch_updated_at` | تحديث timestamp | PRESENT | UNVERIFIED |
| `audit_*` | profiles, memberships, applications, reviews, shifts, events, registrations, event_attendance, certificates, tasks, resources, announcements / AFTER I/U/D | `audit_row_change` | trusted audit trail | PRESENT | UNVERIFIED |

## O. Storage matrix and privacy

`profiles` يفترض أن تكون public-safe عبر view `public_members`، مع عدم عرض البريد والهاتف والمعرفات الداخلية. المراجع التخزينية هي object keys/signed URLs، وليس Base64 أو browser storage.

| Bucket | Public | Intended data | Static policy |
|---|---:|---|---|
| `public-assets` | نعم | brand/public assets | anonymous/authenticated SELECT |
| `avatars` | لا | profile avatars | owner folder write: `<auth.uid()>/*` |
| `gallery` | نعم | published gallery media | anonymous/authenticated SELECT |
| `private-files` | لا | internal committee resources | owner-folder SELECT only in base policy |
| `certificates` | لا | generated certificate files | owner-folder SELECT only in base policy |

الـmigration لا يحذف buckets القديمة (`profile-avatars`, `gallery-media`, `committee-resources`, `certificate-files`) أو كائناتها؛ يسجلها للمراجعة اليدوية. وجود Storage policies الحية، signed URL expiry، وعزل private fields لم يُختبر. لا توجد raw access codes في تصميم الجداول؛ المخزن هو `code_hash` فقط، لكن عدم وجود raw values في database/logs/live data **UNVERIFIED**.

## P. التكامل مع الواجهة

في هذه الخطوة لم تُعدّل الواجهة ولم يتم توصيلها بالقاعدة. هذا مقصود حسب الأمر الجديد. ملفات client الموجودة في checkpoint السابق قد تحتوي أسماء/أنواعًا من schema القديم؛ لذلك يجب اعتبار frontend/database compatibility **UNVERIFIED** إلى أن يُطبّق final schema وتُراجع generated types واختبارات E2E.

## Q. حالة migration

| النطاق | الحالة |
|---|---|
| `supabase/ALIENS_FINAL_DATABASE.sql` | موجود في codebase فقط؛ لم يُطبّق حيًا |
| `supabase/ALIENS_DATABASE_MIGRATION.sql` | موجود؛ non-destructive؛ لم يُنفّذ حيًا |
| `supabase/20260827_aliens_space_core.sql` | مصدر البناء الكنسي السابق، منسوخ إلى final بعد hardening |
| Supabase live tables/rows/policies | UNVERIFIED بسبب 401/connector disabled |
| Bootstrap committee dictionary | migration سيضيفه عند غياب row؛ UNVERIFIED |
| Frontend connection | intentionally deferred |

## Q1. Preserved vs obsolete inventory

| Object/field | Classification | Intended action |
|---|---|---|
| `profiles`, `user_roles`, `committees`, `committee_memberships`, `committee_access_codes`, `access_code_redemptions` | PRESERVE | Keep as canonical authority |
| `applications`, `application_answers`, `application_reviews`, `application_shifts` | PRESERVE | Keep recruitment history and snapshots |
| `ir_evaluator_eligibility`, `ir_assignments`, `evaluations` | PRESERVE | Keep explicit IR authority and history |
| `events`, `event_registrations`, `event_attendance`, `certificates`, `certificate_claims` | PRESERVE | Keep event lifecycle authority |
| `committee_tasks`, `committee_resources`, `committee_announcements`, `notifications`, `audit_logs` | PRESERVE | Keep operational metadata and audit trail |
| `users`, `memberships`, `attendance` | REVIEW/REPLACE | Do not use as authority; map to canonical tables, then human-review |
| `profile-avatars`, `gallery-media`, `committee-resources`, `certificate-files` | REVIEW/REPLACE | Preserve objects; migrate or retire only after inventory and approval |
| `committee`, `committee_key`, `assigned_ir`, `role`, `position`, `committee_position`, `membership_status`, `is_board_member` | REVIEW/REPLACE | Derived/legacy profile fields; never use as authority |
| `localStorage`, `sessionStorage`, `AppStore`, mock/seed/fallback records | OBSOLETE | Remove from operational flows; not database authority |
| `public_members` view | PRESERVE | Canonical public-safe profile projection |
| `<none-known-locally>` legacy/bootstrap view entry | NONE | Artifact scan found no named legacy/bootstrap view declaration |
| Any other live `public` view returned by the migration query | UNVERIFIED/REVIEW | Live-only object is not observable locally; classify after target access |

The migration emits `exists_in_target` for the named tables/buckets and `exists_on_profiles` for the derived fields. These flags become evidence only after the SQL is applied to the target; they are currently UNVERIFIED.

## R. أوامر التطبيق والتحقق اليدوية الآمنة

نفّذها أولًا على مشروع Supabase غير إنتاجي، وخذ backup/لقطة موثقة للحالة الحالية. لا تضع `SUPABASE_DB_URL` أو أي secret داخل ملفات المشروع أو سجل الأوامر.

```bash
export SUPABASE_DB_URL='postgresql://...'
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/ALIENS_FINAL_DATABASE.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/ALIENS_DATABASE_MIGRATION.sql
```

أو الصق الملفين بالترتيب نفسه في Supabase SQL Editor. بعد ذلك نفّذ التحقق read-only:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "select table_name from information_schema.tables where table_schema='public' order by table_name;"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "select table_name, row_security from pg_tables where schemaname='public' order by table_name;"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "select routine_name, security_type from information_schema.routines where routine_schema='public' order by routine_name;"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "select policyname, tablename from pg_policies where schemaname='public' order by tablename, policyname;"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "select id, name, public from storage.buckets order by id;"
```

ثم أنشئ حسابات اختبار منفصلة لـregistered user وcommittee head وIR evaluator وteam head وOG، واختبر RLS وRPCs وrace conditions وStorage signed URLs وcertificate eligibility وWhatsApp deferred state. لا توصل frontend ولا تستخدم Publish كإعلان جاهزية قبل نجاح هذه الخطوات وحفظ مخرجاتها.

## S. ما تم تغييره في هذه المرحلة

تم تعديل schema SQL فقط، وإنشاء `ALIENS_FINAL_DATABASE.sql` و`ALIENS_DATABASE_MIGRATION.sql` وتقرير قاعدة البيانات هذا. لم يتم تعديل React pages أو Supabase client أو أي بيانات حية، ولم يتم تنفيذ SQL destructive.

## T. blockers الحرجة

**CRITICAL:** لا يوجد اتصال موثوق بمشروع Supabase الفعلي، لذلك لا يمكن إثبات live schema أو row counts أو RLS أو Storage. **HIGH:** certificate file generation غير منفذ داخل هذه الخطوة، وfrontend contract لم يُحدّث بعد إعادة تسمية attendance إلى event_attendance. **MEDIUM:** memories/warnings موجودان في schema لكن بلا dashboard operations. **LOW:** تأجيل provider WhatsApp delivery مقصود وليس فشلًا مخفيًا.

## U. الخطة المطلوبة بعد اعتماد قاعدة البيانات

بعد تطبيق schema والتحقق منه: توليد types من Supabase، مراجعة كل service wrapper مقابل RPC signatures، اختبار Auth/RLS بحسابات scope متعددة، إضافة secure certificate renderer، اختبار Storage policies، ثم فقط توصيل الواجهة وتشغيل E2E للـrecruitment/events/certificates/shifting.

# MUST FIX BEFORE DATABASE IS CONSIDERED PRODUCTION READY

تطبيق الملفين على Supabase مستهدف، التحقق من كل الجداول والقيود والسياسات والـRPCs والـtriggers والـbuckets، اختبار RLS cross-scope، تفعيل signatory settings بطريقة admin-controlled، وإثبات أن certificates تنشئ ملفًا فعليًا خاصًا لا record فقط.

# MUST FIX BEFORE FRONTEND IS CONSIDERED PRODUCTION READY

توليد ومراجعة database types، حل contract mismatch المحتمل حول `event_attendance`، منع direct-table writes من كل صفحات الإدارة، اختبار كل button/action مقابل RPC/RLS، وإجراء E2E بحسابات scope حقيقية بعد تطبيق migration.

# SAFE / CORRECT

استخدام UUID وFKs وunique/check/index constraints في schema، ربط profile بـ`auth.users`، عدم hardcode لـOG email، تخزين access-code hash بدل raw code في التصميم، immutable answer snapshots، unique active IR assignment، one certificate per registration، وعدم تنفيذ frontend/database connection في هذه المرحلة.

# UNVERIFIED

كل row counts والحالة الحية للجداول والسياسات والـfunctions والـStorage، Auth trigger وemail confirmation، live RLS denial، capacity/race behavior، certificate file generation، signatory configuration، Data Analysis rows، absence of legacy tables، وWhatsApp provider delivery.

# QUESTIONS THAT REQUIRE A HUMAN DECISION

هل rename `attendance → event_attendance` نهائي أم مطلوب compatibility view؟ ما هو certificate template/renderer المعتمد؟ من يملك صلاحية ضبط signatory؟ هل `gallery-media` public بالكامل أم يحتاج signed URLs؟ وما هو provider WhatsApp النهائي وسياسة retry؟

## المراجع الداخلية

| المرجع | الاستخدام |
|---|---|
| `pasted_content_3.txt` | عقد إعادة بناء قاعدة البيانات الذي حدده المستخدم |
| `supabase/ALIENS_FINAL_DATABASE.sql` | schema الكنسي الناتج |
| `supabase/ALIENS_DATABASE_MIGRATION.sql` | مسار التحويل غير الهدّام واستعلامات التحقق |
| `supabase/README.md` | تعليمات Supabase السابقة ومتطلبات التطبيق |
| `docs/ALIENS_SPACE_ARCHITECTURE.md` | المعمارية والمصفوفات السابقة |
