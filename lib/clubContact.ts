export const CLUB_CONTACT_EMAIL = "akcc.nzchess@gmail.com";
export const CLUB_CONTACT_PHONE = "022 179 3499";
export const CLUB_CONTACT_PHONE_LINK = "tel:+64221793499";
// Migrate previously displayed addresses while retaining future admin customisations.
export function clubContactEmail(settings?: { general_email?: string } | null) {
 const value = String(settings?.general_email || "").trim();
 return !value || ["info@aucklandknights.co.nz", "aucklandknightschessclub@gmail.com"].includes(value.toLowerCase()) ? CLUB_CONTACT_EMAIL : value;
}
