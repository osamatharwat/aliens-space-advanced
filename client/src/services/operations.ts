import { supabase } from "@/lib/supabase";

export async function redeemCommitteeAccessCode(code: string) {
  const result = await supabase.rpc("redeem_committee_access_code", { p_code: code.trim() });
  if (result.error) throw result.error;
  return result.data;
}

export async function submitApplication(input: { userId?: string | null; guestName?: string; guestEmail?: string; guestPhone?: string; committeeId: string; answers: Array<{ question_id: string; answer: string }> }) {
  const result = await supabase.rpc("submit_public_application", {
    p_user_id: input.userId ?? null,
    p_guest_name: input.guestName ?? null,
    p_guest_email: input.guestEmail ?? null,
    p_guest_phone: input.guestPhone ?? null,
    p_committee_id: input.committeeId,
    p_answers: input.answers,
  });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function registerEvent(input: { eventId: string; guest?: { name: string; email: string; phone?: string } }) {
  const result = input.guest
    ? await supabase.rpc("register_event_guest", { p_event_id: input.eventId, p_guest_name: input.guest.name, p_guest_email: input.guest.email, p_guest_phone: input.guest.phone ?? null })
    : await supabase.rpc("register_event_authenticated", { p_event_id: input.eventId });
  if (result.error) throw result.error;
  return result.data;
}

export async function markAttendance(registrationId: string, status: "attended" | "not_attended") {
  const result = await supabase.rpc("mark_event_attendance", { p_registration_id: registrationId, p_status: status });
  if (result.error) throw result.error;
  return result.data;
}

export async function claimGuestCertificate(ticketCode: string) {
  const result = await supabase.rpc("claim_guest_certificate", { p_ticket_code: ticketCode.trim() });
  if (result.error) throw result.error;
  return Array.isArray(result.data) ? result.data[0] : result.data;
}

export async function issueCertificate(registrationId: string) {
  const result = await supabase.rpc("issue_certificate", { p_registration_id: registrationId });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function shiftApplication(applicationId: string, newCommitteeId: string, reason: string) {
  const result = await supabase.rpc("shift_application", { p_application_id: applicationId, p_new_committee_id: newCommitteeId, p_reason: reason });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function assignIRMember(evaluatorId: string, memberId: string) {
  const result = await supabase.rpc("assign_ir_member", { p_evaluator_id: evaluatorId, p_member_id: memberId });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function unassignIRMember(assignmentId: string) {
  const result = await supabase.rpc("unassign_ir_member", { p_assignment_id: assignmentId });
  if (result.error) throw result.error;
  return result.data;
}

export async function reviewApplication(input: { applicationId: string; stage: "ir" | "committee_head" | "leadership"; decision: "submitted" | "under_review" | "accepted" | "rejected" | "waitlisted" | "conflict"; notes?: string }) {
  const result = await supabase.rpc("review_application", { p_application_id: input.applicationId, p_stage: input.stage, p_decision: input.decision, p_notes: input.notes ?? null });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function deleteApplication(applicationId: string) {
  const result = await supabase.rpc("delete_application", { p_application_id: applicationId });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function setIrEvaluatorEligibility(userId: string, eligible: boolean) {
  const result = await supabase.rpc("set_ir_evaluator_eligibility", { p_user_id: userId, p_eligible: eligible });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function saveEvaluation(input: { memberId: string; committeeId?: string; score?: number; notes?: string }) {
  const result = await supabase.rpc("save_evaluation", { p_member_id: input.memberId, p_committee_id: input.committeeId ?? null, p_score: input.score ?? null, p_notes: input.notes ?? null });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function createQuestion(input: { category: "global" | "committee" | "ir"; committeeId?: string; prompt: string; helpText?: string; sortOrder?: number }) {
  const result = await supabase.rpc("create_question", { p_category: input.category, p_committee_id: input.committeeId ?? null, p_prompt: input.prompt, p_help_text: input.helpText ?? null, p_sort_order: input.sortOrder ?? 0 });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function setQuestionEnabled(questionId: string, enabled: boolean) {
  const result = await supabase.rpc("set_question_enabled", { p_question_id: questionId, p_enabled: enabled });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function createEvent(input: { title: string; slug: string; summary?: string; description?: string; startsAt: string; endsAt: string; registrationClosesAt?: string; location?: string; category?: string; committeeId?: string; capacity?: number; isPaid?: boolean; price?: number; whatsappGroupUrl?: string; certificateEnabled?: boolean; isPublic?: boolean }) {
  const result = await supabase.rpc("create_event", { p_title: input.title, p_slug: input.slug, p_summary: input.summary ?? null, p_description: input.description ?? null, p_starts_at: input.startsAt, p_ends_at: input.endsAt, p_registration_closes_at: input.registrationClosesAt ?? null, p_location: input.location ?? null, p_category: input.category ?? null, p_committee_id: input.committeeId ?? null, p_capacity: input.capacity ?? null, p_is_paid: input.isPaid ?? false, p_price: input.price ?? null, p_whatsapp_group_url: input.whatsappGroupUrl ?? null, p_certificate_enabled: input.certificateEnabled ?? false, p_is_public: input.isPublic ?? true });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function setEventPublished(eventId: string, published: boolean) {
  const result = await supabase.rpc("set_event_published", { p_event_id: eventId, p_published: published });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function deleteEvent(eventId: string) {
  const result = await supabase.rpc("delete_event", { p_event_id: eventId });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function createCommitteeTask(input: { committeeId: string; title: string; description?: string; assignedTo?: string; dueAt?: string }) {
  const result = await supabase.rpc("create_committee_task", { p_committee_id: input.committeeId, p_title: input.title, p_description: input.description ?? null, p_assigned_to: input.assignedTo ?? null, p_due_at: input.dueAt ?? null });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function setCommitteeTaskCompleted(taskId: string, completed: boolean) {
  const result = await supabase.rpc("set_committee_task_completed", { p_task_id: taskId, p_completed: completed });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function getAnalyticsSummary() {
  const result = await supabase.rpc("get_analytics_summary");
  if (result.error) throw result.error;
  return result.data as { applications: number; registrations: number; attendance: number; certificates: number; active_memberships: number };
}

export async function exportApplications(committeeId?: string) {
  const result = await supabase.rpc("export_applications", { p_committee_id: committeeId ?? null });
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function updateEvent(input: { eventId: string; title: string; summary?: string; description?: string; location?: string; startsAt: string; endsAt?: string; registrationClosesAt?: string; category?: string; capacity?: number; isPaid?: boolean; price?: number; certificateEnabled?: boolean; isPublic?: boolean }) {
  const result = await supabase.rpc("update_event", { p_event_id: input.eventId, p_title: input.title, p_summary: input.summary ?? null, p_description: input.description ?? null, p_location: input.location ?? null, p_starts_at: input.startsAt, p_ends_at: input.endsAt ?? null, p_registration_closes_at: input.registrationClosesAt ?? null, p_category: input.category ?? null, p_capacity: input.capacity ?? null, p_is_paid: input.isPaid ?? false, p_price: input.price ?? null, p_certificate_enabled: input.certificateEnabled ?? false, p_is_public: input.isPublic ?? false });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function updateCommitteeTask(input: { taskId: string; title: string; description?: string; assignedTo?: string; dueAt?: string }) {
  const result = await supabase.rpc("update_committee_task", { p_task_id: input.taskId, p_title: input.title, p_description: input.description ?? null, p_assigned_to: input.assignedTo ?? null, p_due_at: input.dueAt ?? null });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function deleteCommitteeTask(taskId: string) {
  const result = await supabase.rpc("delete_committee_task", { p_task_id: taskId });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function createCommitteeAnnouncement(input: { committeeId: string; title: string; body: string }) {
  const result = await supabase.rpc("create_committee_announcement", { p_committee_id: input.committeeId, p_title: input.title, p_body: input.body });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function createCommitteeResource(input: { committeeId: string; title: string; objectKey: string; objectUrl?: string }) {
  const result = await supabase.rpc("create_committee_resource", { p_committee_id: input.committeeId, p_title: input.title, p_object_key: input.objectKey, p_object_url: input.objectUrl ?? null });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function deleteCommitteeResource(resourceId: string) {
  const result = await supabase.rpc("delete_committee_resource", { p_resource_id: resourceId });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function reorderQuestion(questionId: string, sortOrder: number) {
  const result = await supabase.rpc("reorder_question", { p_question_id: questionId, p_sort_order: sortOrder });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function updatePublicProfile(input: { name: string; username?: string; avatarObjectKey?: string; isPublic: boolean }) {
  const result = await supabase.rpc("update_public_profile", { p_name: input.name, p_username: input.username ?? null, p_avatar_object_key: input.avatarObjectKey ?? null, p_is_public: input.isPublic });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function exportAnalytics() {
  const result = await supabase.rpc("export_analytics");
  if (result.error) throw result.error;
  return result.data;
}

export async function reassignIRMember(assignmentId: string, newEvaluatorId: string) {
  const result = await supabase.rpc("reassign_ir_member", { p_assignment_id: assignmentId, p_new_evaluator_id: newEvaluatorId });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function updateQuestion(input: { questionId: string; prompt: string; helpText?: string; sortOrder: number }) {
  const result = await supabase.rpc("update_question", { p_question_id: input.questionId, p_prompt: input.prompt, p_help_text: input.helpText ?? null, p_sort_order: input.sortOrder });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function deleteQuestion(questionId: string) {
  const result = await supabase.rpc("delete_question", { p_question_id: questionId });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function previewQuestions(committeeId?: string) {
  const result = await supabase.rpc("preview_questions", { p_committee_id: committeeId ?? null });
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function setEventWhatsappGroup(eventId: string, groupUrl: string) {
  const result = await supabase.rpc("set_event_whatsapp_group", { p_event_id: eventId, p_group_url: groupUrl });
  if (result.error) throw result.error;
  return result.data as boolean;
}
