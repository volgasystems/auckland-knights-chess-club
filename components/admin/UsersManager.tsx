"use client";
import { useEffect, useMemo, useState } from "react";
import { AREA_LABELS, ROLES, ROLE_LABELS, roleAreas } from "@/lib/roles";

export default function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ first_name: "", last_name: "", email: "", password: "", role: "admin" });

  async function load() {
    const res = await fetch("/api/admin/users");
    const json = await res.json();
    setUsers(json.users || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...newUser }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) return alert(json.error || "Unable to create user");
    setNewUser({ first_name: "", last_name: "", email: "", password: "", role: "admin" });
    setShowAdd(false);
    load();
  }

  async function update(id: string, role: string, is_active: boolean, first_name: string, last_name: string) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role, is_active, first_name, last_name }),
    });
    const json = await res.json();
    if (!res.ok) alert(json.error || "Unable to update user");
    else load();
  }

  async function remove(id: string, email: string) {
    if (!confirm(`Remove admin login for ${email}? This deletes the Supabase Auth user and profile.`)) return;
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) alert(json.error || "Unable to remove user");
    else load();
  }

  const filtered = useMemo(
    () => users.filter((u) => `${u.first_name || ""} ${u.last_name || ""} ${u.full_name || ""} ${u.email || ""}`.toLowerCase().includes(search.toLowerCase())),
    [users, search]
  );

  if (loading) return <p>Loading users...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Manage Users & Roles</h1>
          <p className="mt-2 text-sm text-slate-600">
            Super Admin can add, edit, remove and activate/deactivate admin access. Public club members do not need login.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAdd((v) => !v)} className="btn-primary">{showAdd ? "Close Add User" : "Add User"}</button>
          <button onClick={load} className="btn-secondary">Refresh</button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={createUser} className="card mt-6 p-5">
          <h2 className="text-xl font-bold">Add New Admin / Staff User</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label><span className="admin-label">First name *</span><input required value={newUser.first_name} onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })} className="admin-input mt-1" /></label>
            <label><span className="admin-label">Last name</span><input value={newUser.last_name} onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })} className="admin-input mt-1" /></label>
            <label><span className="admin-label">Email *</span><input required type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="admin-input mt-1" /></label>
            <label><span className="admin-label">Temporary password *</span><input required type="password" minLength={8} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="admin-input mt-1" /></label>
            <label><span className="admin-label">Role *</span><select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="admin-input mt-1">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label>
          </div>
          <button disabled={creating} className="btn-primary mt-5">{creating ? "Creating..." : "Create User"}</button>
        </form>
      )}

      <div className="card mt-5 p-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="admin-input max-w-md" placeholder="Search users by name or email" />
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">First name</th>
              <th className="p-3">Last name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Access</th>
              <th className="p-3">Active</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t align-top">
                <td className="p-3"><input defaultValue={u.first_name || ""} id={`first-${u.id}`} className="admin-input w-32" /></td>
                <td className="p-3"><input defaultValue={u.last_name || ""} id={`last-${u.id}`} className="admin-input w-32" /></td>
                <td className="p-3">{u.email}</td>
                <td className="p-3"><select defaultValue={u.role} id={`role-${u.id}`} className="admin-input min-w-48">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></td>
                <td className="p-3 max-w-md text-xs text-slate-600">{roleAreas(u.role).map((a) => AREA_LABELS[a] || a).join(", ") || "No admin access"}</td>
                <td className="p-3"><input type="checkbox" defaultChecked={u.is_active} id={`active-${u.id}`} /></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => update(
                        u.id,
                        (document.getElementById(`role-${u.id}`) as HTMLSelectElement).value,
                        (document.getElementById(`active-${u.id}`) as HTMLInputElement).checked,
                        (document.getElementById(`first-${u.id}`) as HTMLInputElement).value,
                        (document.getElementById(`last-${u.id}`) as HTMLInputElement).value
                      )}
                      className="btn-secondary py-2"
                    >
                      Save/Edit
                    </button>
                    <button onClick={() => remove(u.id, u.email)} className="rounded-md bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
