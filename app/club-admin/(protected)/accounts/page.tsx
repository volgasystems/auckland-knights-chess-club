import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";
export default async function Accounts() {
  await requireAdmin("payment_accounts");
  const {data,error} = await createSupabaseServiceClient().from("payment_accounts").select("*").order("name");
  if (error) return <div className="card p-6"><h1 className="text-3xl font-bold">Payment Accounts</h1><p className="mt-4">Payment accounts are unavailable. Apply supabase/migrations/20261009_payment_accounts.sql in the Supabase SQL editor, then refresh. If already applied, check database connectivity.</p></div>;
  const setup = await createSupabaseServiceClient().from("payment_accounts").select("use_for_membership,use_for_tournaments").limit(1);
  const bankFields = setup.error ? [] : [{name:"use_for_membership",label:"Default bank account for membership",type:"checkbox"}, {name:"use_for_tournaments",label:"Default bank account for tournaments",type:"checkbox"}];
  return <div>{setup.error && <p className="mb-4 rounded-lg bg-amber-50 p-4">To enable registration by bank transfer, run 20261025_bank_transfer_registration.sql in Supabase. Existing accounts can still be saved.</p>}<p className="mb-4 text-sm">Add multiple accounts, then select an account when editing a tournament or calendar event. Accounts used by events cannot be deleted; deactivate them instead. Choose one default account for each payment type. A tournament-specific account takes priority over the tournament default. Bank transfers remain tentative until an admin verifies receipt.</p><CrudManager table="payment_accounts" title="Manage Payment Accounts" rows={data || []} initialValues={{is_active:true}} fields={[
    {name:"name",label:"Account name",required:true}, {name:"code",label:"Code / usage",required:true},
    {name:"account_number",label:"Account number",required:true}, {name:"purpose",label:"Purpose",required:true},
    {name:"is_active",label:"Active",type:"checkbox"}, ...bankFields
  ]}/></div>;
}
