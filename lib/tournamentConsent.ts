export const DEFAULT_CANCELLATION_POLICY = `Withdrawals requested by email at least 48 hours before the tournament starts receive a full entry-fee refund. Later withdrawals and no-shows are not normally refunded; illness or exceptional circumstances will be considered individually.
If the organiser cancels the tournament, entry fees and any booking fees paid will be refunded in full. If the date or venue changes materially and you cannot attend, contact the organiser to request a refund.
Request a cancellation or refund at akcc.nzchess@gmail.com with the player name, tournament and registration/payment reference. Approved refunds are returned to the original payment method; please allow 5–10 business days for processing.
Reporting a round absence does not cancel your entry or request a refund.`;
export const STATUTORY_RIGHTS = "This policy does not limit any rights or remedies you have under New Zealand consumer law.";
export const PHOTO_CONSENT_NOTICE = "I allow Auckland Knights Chess Club to take photographs and video of this player during the tournament and publish selected images on the club website, club social media and club tournament publicity. This is optional; declining does not affect entry. For a player under 18, permission must be given by a parent or legal guardian, with the child's wishes respected. You can withdraw permission for future use and request removal from club-controlled channels by contacting akcc.nzchess@gmail.com. Copies already shared by others may not be recoverable.";
export function consentSchemaAvailable(t: any) { return Object.prototype.hasOwnProperty.call(t, "cancellation_refund_policy"); }
export function cancellationPolicy(t: any) { return `${String(t.cancellation_refund_policy || "").trim() || DEFAULT_CANCELLATION_POLICY}\n\n${STATUTORY_RIGHTS}`; }
export function checked(value: unknown) { return value === true || value === "on" || value === "true"; }
export function registrationConsent(t: any, body: any, now = new Date()) {
  if (!checked(body.policy_accepted)) throw new Error("Read and accept the cancellation and refund policy.");
  const policy = cancellationPolicy(t);
  if (body.policy_snapshot !== policy) throw new Error("The tournament policy has changed. Reload the registration page and review it again.");
  const photo = checked(body.photo_consent);
  let name: string | null = null, role: string | null = null;
  if (photo) {
    if (body.photo_notice !== PHOTO_CONSENT_NOTICE) throw new Error("The photography notice has changed. Reload and review it again.");
    name = typeof body.photo_consent_by === "string" ? body.photo_consent_by.trim() : "";
    role = body.photo_consent_role;
    if (!name || name.length > 150 || !["player", "parent_guardian"].includes(String(role))) throw new Error("Enter the name and role of the person giving photo consent.");
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(now);
    const adult = `${Number(body.date_of_birth.slice(0, 4)) + 18}${body.date_of_birth.slice(4)}` <= today;
    if (!adult && role !== "parent_guardian") throw new Error("Photo consent for a player under 18 must come from a parent or legal guardian.");
    if (role === "parent_guardian" && !checked(body.photo_child_agreement)) throw new Error("Confirm you are the parent/legal guardian and have respected the child's wishes.");
  }
  return { cancellation_policy_snapshot: policy, cancellation_policy_accepted_at: now.toISOString(), photo_consent: photo, photo_consent_notice: PHOTO_CONSENT_NOTICE, photo_consent_recorded_at: now.toISOString(), photo_consent_by: photo ? name : null, photo_consent_role: photo ? role : null, photo_child_agreement: photo && role === "parent_guardian" ? true : null };
}
