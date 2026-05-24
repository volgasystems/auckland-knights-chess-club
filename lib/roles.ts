export const ROLES = [
  "super_admin",
  "admin",
  "news_editor",
  "tournament_manager",
  "gallery_manager",
  "faq_manager",
  "coaching_manager",
  "social_media_manager",
  "communications_manager",
  "member"
] as const;
export type Role = typeof ROLES[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  news_editor: "News Editor",
  tournament_manager: "Tournament Manager",
  gallery_manager: "Gallery Manager",
  faq_manager: "FAQ Manager",
  coaching_manager: "Coaching Manager",
  social_media_manager: "Social Media Manager",
  communications_manager: "Communications Manager",
  member: "No Admin Access"
};

export type AdminArea =
  | "dashboard" | "documentation" | "users" | "settings" | "news" | "tournaments" | "results"
  | "members" | "tournament_registrations" | "gallery" | "faq" | "coaching"
  | "agm" | "absences" | "payments" | "social_posts" | "live_boards"
  | "membership_options" | "calendar" | "reports" | "enquiries" | "member_notices" | "email_templates" | "bulk_email" | "email_diagnostics";

export const AREA_LABELS: Record<AdminArea, string> = {
  dashboard: "Dashboard",
  documentation: "Product Documentation",
  users: "Manage Users & Roles",
  settings: "Club Settings",
  news: "News",
  tournaments: "Tournaments",
  results: "Results",
  members: "Members",
  tournament_registrations: "Tournament Registrations",
  gallery: "Photo Gallery",
  faq: "F.A.Q.",
  coaching: "Coaching",
  agm: "AGM & Notices",
  absences: "Absence Reports",
  payments: "Payments",
  social_posts: "Social Posts",
  live_boards: "Live Boards",
  membership_options: "Membership Options",
  calendar: "Calendar",
  reports: "Reports",
  enquiries: "Contact Enquiries",
  member_notices: "Member Notices",
  email_templates: "Email Templates",
  bulk_email: "Bulk Email",
  email_diagnostics: "Email Diagnostics"
};

export function roleAreas(role: string | null | undefined): AdminArea[] {
  const all = Object.keys(AREA_LABELS) as AdminArea[];
  if (role === "super_admin") return all.filter(a => a !== "reports");
  if (role === "admin") return all.filter(a => a !== "users" && a !== "reports");
  if (role === "news_editor") return ["dashboard", "documentation", "news"];
  if (role === "tournament_manager") return ["dashboard", "documentation", "tournaments", "results", "tournament_registrations", "absences", "live_boards", "calendar"];
  if (role === "gallery_manager") return ["dashboard", "documentation", "gallery"];
  if (role === "faq_manager") return ["dashboard", "documentation", "faq"];
  if (role === "coaching_manager") return ["dashboard", "documentation", "coaching"];
  if (role === "social_media_manager") return ["dashboard", "documentation", "social_posts"];
  if (role === "communications_manager") return ["dashboard", "documentation", "member_notices", "email_templates", "bulk_email", "email_diagnostics"];
  return [];
}

export function canAccess(role: string | null | undefined, area: AdminArea): boolean {
  return roleAreas(role).includes(area);
}

export function canAccessTable(role: string | null | undefined, table: string): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  if (role === "admin") return table !== "profiles";
  if (role === "news_editor") return table === "news_posts";
  if (role === "tournament_manager") return ["tournaments", "tournament_registrations", "absences", "live_board_links"].includes(table);
  if (role === "gallery_manager") return table === "gallery_photos";
  if (role === "faq_manager") return table === "faqs";
  if (role === "coaching_manager") return ["coaches", "coaching_topics"].includes(table);
  if (role === "social_media_manager") return table === "social_posts";
  if (role === "communications_manager") return ["member_notices", "email_templates"].includes(table);
  return false;
}

export function canUseSocialMedia(role: string | null | undefined): boolean {
  return ["super_admin", "admin", "social_media_manager"].includes(role || "");
}
