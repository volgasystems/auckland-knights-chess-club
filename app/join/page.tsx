export const dynamic = "force-dynamic";
import MembershipRenewal from "@/components/MembershipRenewal";
import { readMemberAccessToken } from "@/lib/membershipAccess";
import PageShell from "@/components/PageShell";
import JoinMembershipForm from "@/components/JoinMembershipForm";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ member_token?: string }> }){
  const s=createSupabaseServiceClient();
  const {data: options}=await s.from("membership_options").select("key,name,description,fee_cents,joining_period,validity_months,valid_until_month").eq("is_active",true).order("display_order",{ascending:true});
  const { member_token } = await searchParams;
  let member: any = null; let linkError = "";
  if (member_token) {
    const access = readMemberAccessToken(member_token);
    if (access) {
      const { data } = await s.from("club_memberships").select("id,first_name,last_name,email,phone,date_of_birth,school,nzcf_id,fide_id,street_address,suburb,city,postcode,membership_id,membership_end_date,payment_status,membership_status").eq("id", access.id).single();
      if (data && data.email.toLowerCase() === access.email && data.membership_id && data.membership_status !== "cancelled" && ["paid","manual_paid","waived"].includes(data.payment_status)) member = data;
    }
    if (!member) linkError = "Your link has expired or this membership needs club assistance. Request a new link below.";
  }
  return <PageShell><main className="container-page py-12"><div className="mb-8"><h1 className="text-4xl font-extrabold">Join Auckland Knights</h1><p className="mt-3 text-slate-600">Club member registration does not create website login access. Admin access is separate and private.</p></div><MembershipRenewal member={member} token={member_token} options={options || []} linkError={linkError} />{!member && <div className="grid gap-8 lg:grid-cols-[1fr,1.4fr]"><div className="space-y-5"><section className="card p-6"><h2 className="text-xl font-bold">School Pupils</h2><p className="mt-2 text-sm text-slate-600">Junior and senior club options for school pupils who already know how chess pieces move and capture.</p></section><section className="card p-6"><h2 className="text-xl font-bold">Individual Members</h2><p className="mt-2 text-sm text-slate-600">For tertiary students and adults who want to join club chess activities and events.</p></section><section className="card p-6"><h2 className="text-xl font-bold">Associate Members</h2><p className="mt-2 text-sm text-slate-600">For players wanting limited club participation. Fees and rules can be updated by the club.</p></section></div><JoinMembershipForm optionsFromDb={(options||[]) as any} /></div>}</main></PageShell>;
}
