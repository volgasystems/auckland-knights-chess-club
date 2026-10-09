function normalise(value: any) { return String(value || "").trim().toLowerCase().replace(/\s+/g, " "); }
export function tournamentEmailRecipients(members: any[], registrations: any[]) {
  return members.flatMap(member => {
    const registration = registrations.find(r => r.payment_status === "paid" && r.registration_status === "confirmed" && normalise(r.email) === normalise(member.email) && normalise(r.first_name) === normalise(member.first_name) && normalise(r.last_name) === normalise(member.last_name));
    return registration ? [{...member, first_name:registration.first_name, last_name:registration.last_name, registration_id:registration.id, category_name:registration.category_name, entry_fee_cents:registration.entry_fee_cents}] : [];
  });
}
