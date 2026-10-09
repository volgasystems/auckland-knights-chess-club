import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";

export default async function AGMAdmin() {
  await requireAdmin("agm");
  const s = createSupabaseServiceClient();
  const [meetings, decisions, team] = await Promise.all([
    s.from("agm_meetings").select("*").order("meeting_date", { ascending: false }),
    s.from("agm_decisions").select("*").order("created_at", { ascending: false }),
    s.from("elected_team_members").select("*").order("display_order", { ascending: true }),
  ]);
  for (const result of [meetings, decisions, team]) {
    if (result.error) throw new Error(`Unable to load AGM records: ${result.error.message}`);
  }
  const choices = (meetings.data || []).map((m) => ({ value: m.id, label: `${m.title}${m.meeting_date ? ` (${m.meeting_date})` : ""}` }));
  const meetingLabels = Object.fromEntries(choices.map((m) => [m.value, m.label]));
  const meetingField = { name: "meeting_id", label: "AGM notice / meeting", required: true, choices };
  return <div className="space-y-12">
    <CrudManager table="agm_meetings" title="Manage AGM & Notices" rows={meetings.data || []} fields={[
      { name: "title", label: "Meeting title", required: true },
      { name: "meeting_date", label: "Meeting date", type: "date" },
      { name: "venue", label: "Venue / online link" },
      { name: "summary", label: "Meeting summary", textarea: true, help: "Use blank lines between paragraphs. Markdown is supported: ## Heading, **bold**, numbered/bullet lists and tables. Paste the minutes once, then save." },
      { name: "is_published", label: "Publish AGM notice", type: "checkbox" },
    ]} />
    {choices.length ? <>
      <p className="text-sm text-slate-600">Add each decision and elected team member below. Select the matching meeting; entries appear on its published AGM notice.</p>
      <CrudManager table="agm_decisions" title="Decisions Made" rows={decisions.data || []} meetingLabels={meetingLabels} fields={[
        meetingField,
        { name: "title", label: "Decision title", required: true },
        { name: "description", label: "Decision details", textarea: true },
        { name: "outcome", label: "Outcome", options: ["Approved", "Rejected", "Deferred", "Withdrawn"] },
        { name: "proposed_by", label: "Proposed by" },
        { name: "seconded_by", label: "Seconded by" },
        { name: "action_owner", label: "Action owner" },
        { name: "due_date", label: "Action due date", type: "date" },
      ]} />
      <CrudManager table="elected_team_members" title="Elected Team" rows={team.data || []} meetingLabels={meetingLabels} fields={[
        meetingField,
        { name: "role_title", label: "Role / position", required: true },
        { name: "person_name", label: "Elected member name", required: true },
        { name: "email", label: "Email (admin only)", type: "email" },
        { name: "phone", label: "Phone (admin only)", type: "tel" },
        { name: "term_start", label: "Term start", type: "date" },
        { name: "term_end", label: "Term end", type: "date" },
        { name: "display_order", label: "Display order", type: "number", help: "Lower numbers appear first. Leave blank for 0." },
        { name: "notes", label: "Notes (admin only)", textarea: true },
      ]} />
    </> : <p className="card p-6">Add an AGM notice first, then you can add its decisions and elected team.</p>}
  </div>;
}
