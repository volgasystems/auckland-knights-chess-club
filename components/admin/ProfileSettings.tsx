"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function ProfileSettings({ profile }: { profile: any }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    try { const res = await fetch("/api/admin/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))) }); const data = await res.json(); if (!res.ok) throw Error(data.error); setMessage("Profile saved."); router.refresh(); } catch (e: any) { setMessage(e.message || "Unable to save profile."); } finally { setBusy(false); }
  }
  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const data = Object.fromEntries(new FormData(form));
    if (data.new_password !== data.confirm_password) { setPasswordMessage("New passwords do not match."); return; }
    setPasswordBusy(true); setPasswordMessage("");
    try { const res = await fetch("/api/admin/profile/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_password: data.current_password, new_password: data.new_password }) }); const result = await res.json(); if (!res.ok) throw Error(result.error); form.reset(); window.location.replace("/club-admin/login?password_changed=1"); } catch (e: any) { setPasswordMessage(e.message || "Unable to change password."); } finally { setPasswordBusy(false); }
  }
  return <div className="mt-6 grid max-w-4xl gap-6 md:grid-cols-2"><form onSubmit={save} className="card space-y-4 p-6"><h2 className="text-xl font-bold">Profile settings</h2>{[["first_name", "First name"], ["last_name", "Last name"], ["phone", "Phone"]].map(([key, label]) => <label key={key} className="block"><span className="label">{label}</span><input name={key} defaultValue={profile[key] || ""} required={key !== "phone"} maxLength={key === "phone" ? 40 : 100} className="input mt-1"/></label>)}<button disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save profile"}</button>{message && <p role="status">{message}</p>}</form><form onSubmit={changePassword} className="card space-y-4 p-6"><h2 className="text-xl font-bold">Change password</h2><p className="text-sm text-stone-600">Use 12–128 characters. You will need to sign in again after changing your password.</p>{[["current_password", "Current password"], ["new_password", "New password"], ["confirm_password", "Confirm new password"]].map(([key, label]) => <label key={key} className="block"><span className="label">{label}</span><input name={key} type="password" autoComplete={key === "current_password" ? "current-password" : "new-password"} required minLength={key === "current_password" ? undefined : 12} maxLength={128} className="input mt-1"/></label>)}<button disabled={passwordBusy} className="btn-primary">{passwordBusy ? "Changing…" : "Change password"}</button>{passwordMessage && <p role="status">{passwordMessage}</p>}</form></div>;
}
