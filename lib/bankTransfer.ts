import { randomUUID } from "node:crypto";
export function registrationPaymentMethod(value: unknown) {
  if (value == null || value === "" || value === "stripe") return "stripe";
  if (value === "bank_transfer") return "bank_transfer";
  throw new Error("Select card payment or bank transfer.");
}
export function bankReference(kind: "membership" | "tournament", id: string) {
  return `${kind === "membership" ? "M" : "T"}${id.replace(/-/g, "").slice(0, 11).toUpperCase()}`;
}
export async function bankTransferAccount(s: any, kind: "membership" | "tournament", tournament?: any) {
  const table = kind === "membership" ? "club_memberships" : "tournament_registrations";
  const ready = await s.from(table).select("payment_method,bank_account_snapshot,payment_reference").limit(1);
  if (ready.error) return null;
  const { data, error } = await s.from("payment_accounts").select("*").eq("is_active", true);
  if (error) return null;
  const rows = data || [];
  let account;
  if (kind === "tournament" && tournament?.payment_account_id) {
    account = rows.find((a: any) => a.id === tournament.payment_account_id);
  } else {
    const preferred = rows.filter((a: any) => a[kind === "membership" ? "use_for_membership" : "use_for_tournaments"] === true);
    account = preferred.length === 1 ? preferred[0] : rows.length === 1 ? rows[0] : null;
  }
  if (!account?.account_number || !(account.name || account.account_name)) return null;
  return { id: account.id, name: account.name || account.account_name, account_number: account.account_number };
}
export async function prepareBankTransfer(s: any, kind: "membership" | "tournament", tournament?: any) {
  const account = await bankTransferAccount(s, kind, tournament);
  if (!account) throw new Error("Bank transfer is not configured. Contact akcc.nzchess@gmail.com or select card payment.");
  const id = randomUUID();
  return { id, payment_method: "bank_transfer", bank_account_snapshot: account, payment_reference: bankReference(kind, id) };
}
export function bankInstructions(record: any, amount: number) {
  return { account_name: record.bank_account_snapshot.name, account_number: record.bank_account_snapshot.account_number, reference: record.payment_reference, amount_cents: amount };
}
export function bankInstructionText(record: any, amount: number) {
  const b = bankInstructions(record, amount);
  return `Bank transfer instructions\nAccount name: ${b.account_name}\nAccount number: ${b.account_number}\nAmount: NZ$${(amount / 100).toFixed(2)}\nPayment reference: ${b.reference}\nStatus: Tentative — awaiting bank transfer and admin verification.\nUse this reference when making your transfer. Do not register or pay twice. Your registration is confirmed only after an admin verifies receipt. A tentative tournament entry does not reserve a place. Contact akcc.nzchess@gmail.com if you have already paid.`;
}
