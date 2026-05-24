"use client";

import { useState } from "react";

type SocialPost = {
  id: string;
  title?: string;
  post_type?: string;
  message?: string;
  image_url?: string;
  website_url?: string;
  platforms?: string[];
  status?: string;
  created_at?: string;
};

const platformUrls: Record<string, string> = {
  Facebook: "https://www.facebook.com/",
  Instagram: "https://www.instagram.com/",
  YouTube: "https://www.youtube.com/",
  X: "https://x.com/compose/post",
  LinkedIn: "https://www.linkedin.com/feed/",
};

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text || "");
    alert(`${label} copied.`);
  } catch {
    alert("Copy failed. Please select and copy manually.");
  }
}

export default function SocialShareAssistant({ posts }: { posts: SocialPost[] }) {
  const [expanded, setExpanded] = useState<string | null>(posts?.[0]?.id || null);

  async function markPosted(post: SocialPost) {
    const res = await fetch("/api/admin/crud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "social_posts",
        action: "update",
        id: post.id,
        payload: {
          status: "posted",
          posted_at: new Date().toISOString().slice(0, 10),
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json.error || "Unable to mark as posted.");
    window.location.reload();
  }

  if (!posts?.length) {
    return <div className="card p-5 text-sm text-slate-600">No social media post drafts yet. Create one below, or publish a news/result with “Create social media draft”.</div>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const platforms = Array.isArray(post.platforms) ? post.platforms : [];
        const open = expanded === post.id;
        return (
          <section key={post.id} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(open ? null : post.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 bg-stone-50 px-5 py-4 text-left"
            >
              <div>
                <h3 className="text-lg font-extrabold text-black">{post.title || "Untitled social post"}</h3>
                <p className="text-xs uppercase tracking-wide text-slate-500">{post.post_type || "custom"} · {post.status || "draft"}</p>
              </div>
              <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">{open ? "Hide" : "Open Share Assistant"}</span>
            </button>
            {open && (
              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_360px]">
                <div>
                  <label className="admin-label">Caption / message</label>
                  <textarea readOnly value={post.message || ""} rows={9} className="admin-input mt-2 font-sans" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => copyText(post.message || "", "Caption")} className="btn-primary py-2">Copy Caption</button>
                    {post.website_url && <button type="button" onClick={() => copyText(post.website_url || "", "Website link")} className="btn-secondary py-2">Copy Link</button>}
                    <button type="button" onClick={() => markPosted(post)} className="btn-gold py-2">Mark as Posted</button>
                  </div>
                  {post.website_url && <p className="mt-3 break-all text-sm text-slate-600"><b>Website link:</b> {post.website_url}</p>}
                </div>
                <aside className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  {post.image_url ? <img src={post.image_url} alt="Social post" className="mb-4 h-44 w-full rounded-xl object-cover" /> : <div className="mb-4 rounded-xl bg-white p-5 text-sm text-slate-500">No image selected.</div>}
                  <h4 className="font-extrabold text-black">Selected platforms</h4>
                  <div className="mt-3 grid gap-2">
                    {(platforms.length ? platforms : ["Facebook", "Instagram", "X", "LinkedIn"]).map((platform) => (
                      <a
                        key={platform}
                        href={platformUrls[platform] || "https://www.google.com"}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-black hover:border-akcc-gold hover:bg-akcc-gold"
                      >
                        Open {platform}
                      </a>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-600">Steps: copy the caption, open the social platform, paste the caption, attach the image if required, then mark this draft as posted.</p>
                </aside>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
