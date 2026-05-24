import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import EnquiriesManager from "@/components/admin/EnquiriesManager";

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<any> }) {
  await requireAdmin("enquiries");
  const sp = await searchParams;
  const s = createSupabaseServiceClient();
  let q = s.from("contact_enquiries").select("*").order("created_at", { ascending: false });
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.enquiry_type) q = q.eq("enquiry_type", sp.enquiry_type);
  const { data } = await q;

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Contact Enquiries</h1>
      <p className="mt-2 text-sm text-slate-600">
        Preview enquiries, filter by status/type, and update each enquiry to In Progress, Responded, Closed or Reopened.
      </p>

      <form className="card mt-5 flex flex-wrap gap-3 p-4">
        <select name="status" defaultValue={sp.status || ""} className="admin-input w-48">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="responded">Responded</option>
          <option value="closed">Closed</option>
        </select>
        <select name="enquiry_type" defaultValue={sp.enquiry_type || ""} className="admin-input w-64">
          <option value="">All enquiry types</option>
          <option>General enquiry</option>
          <option>Membership enquiry</option>
          <option>Tournament enquiry</option>
          <option>Coaching enquiry</option>
          <option>Junior chess enquiry</option>
          <option>Website/support enquiry</option>
        </select>
        <button className="btn-primary py-2">Preview</button>
      </form>

      <EnquiriesManager enquiries={data || []} />
    </div>
  );
}
