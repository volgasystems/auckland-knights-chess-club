"use client";
import { useState } from "react";

export default function ContactForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true); setMessage("");
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setMessage(json.error || "Unable to send enquiry. Please try again."); return; }
    setMessage("Thank you. Your enquiry has been received by Auckland Knights Chess Club.");
    const form = document.getElementById("contact-form") as HTMLFormElement | null;
    form?.reset();
  }

  return <form id="contact-form" action={submit} className="card p-6">
    <h2 className="text-xl font-extrabold text-akcc-navy">Send us a message</h2>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label><span className="label">Full Name *</span><input name="full_name" required className="input mt-1" /></label>
      <label><span className="label">Email *</span><input name="email" type="email" required className="input mt-1" /></label>
      <label><span className="label">Phone</span><input name="phone" className="input mt-1" /></label>
      <label><span className="label">Enquiry Type</span><select name="enquiry_type" className="input mt-1"><option>General enquiry</option><option>Membership enquiry</option><option>Tournament enquiry</option><option>Coaching enquiry</option><option>Junior chess enquiry</option><option>Website/support enquiry</option></select></label>
      <label className="md:col-span-2"><span className="label">Subject *</span><input name="subject" required className="input mt-1" /></label>
      <label className="md:col-span-2"><span className="label">Message *</span><textarea name="message" required rows={6} className="input mt-1" /></label>
    </div>
    <button disabled={loading} className="btn-primary mt-5">{loading ? "Sending..." : "Submit Enquiry"}</button>
    {message && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm font-bold text-akcc-blue">{message}</p>}
  </form>
}
