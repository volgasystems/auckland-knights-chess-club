import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";
export default async function Accounts() {
  await requireAdmin("payment_accounts");
  const {data,error} = await createSupabaseServiceClient().from("payment_accounts").select("*").order("name");
  if (error) return <div className="card p-6"><h1 className="text-3xl font-bold">Payment Accounts</h1><p className="mt-4">Payment accounts are unavailable. Apply supabase/migrations/20261009_payment_accounts.sql in the Supabase SQL editor, then refresh. If already applied, check database connectivity.</p></div>;
  return <div><p className="mb-4 text-sm">Add multiple accounts, then select an account when editing a tournament or calendar event. Accounts used by events cannot be deleted; deactivate them instead. Bank transfers must be verified separately.</p><CrudManager table="payment_accounts" title="Manage Payment Accounts" rows={data || []} initialValues={{is_active:true}} fields={[
    {name:"name",label:"Account name",required:true}, {name:"code",label:"Code / usage",required:true},
    {name:"account_number",label:"Account number",required:true}, {name:"purpose",label:"Purpose",required:true},
    {name:"is_active",label:"Active",type:"checkbox"}
  ]}/></div>;
}
