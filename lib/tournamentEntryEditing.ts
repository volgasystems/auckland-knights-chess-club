import { validDateOfBirth } from "@/lib/registrationValidation";
export const ENTRY_FIELDS = [
 {key:"first_name",label:"First name",required:true}, {key:"last_name",label:"Last name",required:true},
 {key:"email",label:"Email",type:"email",required:true}, {key:"phone",label:"Phone",required:true},
 {key:"date_of_birth",label:"Date of birth",type:"date",required:true},
 {key:"fide_id",label:"FIDE ID"},{key:"fide_rating",label:"FIDE rating",type:"number"},
 {key:"nzcf_id",label:"NZCF ID"},{key:"nzcf_rating",label:"NZCF rating",type:"number"},
 {key:"club_name",label:"Club"},{key:"school_name",label:"School"},
 {key:"parent_guardian_name",label:"Parent/guardian name"},{key:"parent_guardian_phone",label:"Parent/guardian phone"},
 {key:"street_address",label:"Street address"},{key:"suburb",label:"Suburb"},{key:"city",label:"City"},{key:"postcode",label:"Postcode"}
];
export function editableEntry(row: any) { return Object.fromEntries(ENTRY_FIELDS.map(f=>[f.key,row[f.key] == null ? "" : f.type === "date" ? String(row[f.key]).slice(0,10) : String(row[f.key])])); }
export function validateEntryChanges(payload: unknown) {
 if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Enter the player details.");
 const source=payload as Record<string, unknown>;const clean:Record<string,string|number|null>={};
 for (const f of ENTRY_FIELDS) {
  const value=source[f.key];if(value != null && typeof value !== "string" && typeof value !== "number")throw new Error(`Enter a valid ${f.label.toLowerCase()}.`);
  const text=String(value??"").trim();if(f.required&&!text)throw new Error(`${f.label} is required.`);
  if(text.length>500)throw new Error(`${f.label} must be 500 characters or less.`);
  if(f.type==="number") {const n=Number(text);if(text&&(!Number.isInteger(n)||n<0||n>4000))throw new Error(`${f.label} must be a whole number from 0 to 4000.`);clean[f.key]=text?n:null;}else clean[f.key]=text||null;
 }
 if(!validDateOfBirth(clean.date_of_birth))throw new Error("Enter a valid date of birth that is not in the future.");
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(clean.email)))throw new Error("Enter a valid email address.");
 clean.email=String(clean.email).toLowerCase();return clean;
}
