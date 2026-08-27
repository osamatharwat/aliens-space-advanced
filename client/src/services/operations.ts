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
