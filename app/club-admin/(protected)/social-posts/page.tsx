import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";
import SocialShareAssistant from "@/components/admin/SocialShareAssistant";

export default async function SocialPostsAdmin(){
  await requireAdmin("social_posts");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("social_posts").select("*").order("created_at",{ascending:false});
  const rows = data || [];
  return <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-extrabold text-black">Social Media Share Assistant</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">Prepare posts for Facebook, Instagram, X, YouTube and LinkedIn. Copy the caption, open the platform, post manually, and mark the item as posted. Direct automatic posting requires platform API approvals and tokens.</p>
    </div>
    <SocialShareAssistant posts={rows} />
    <CrudManager table="social_posts" title="Create / Edit Social Media Post" rows={rows} fields={[
      {name:'title',label:'Post title',required:true},
      {name:'post_type',label:'Post type',options:['news','result','custom','tournament']},
      {name:'message',label:'Post message / caption',type: "caption",required:true},
      {name:'image_url',label:'Image',type:'image',imageBucket:'news-images'},
      {name:'website_url',label:'Website link'},
      {name:'platforms',label:'Selected social media platforms',type:'multi_options',options:['Facebook','Instagram','YouTube','X','LinkedIn']},
      {name:'publish_as_news',label:'Also publish this social media post as website news',type:'checkbox'},
      {name:'status',label:'Status',options:['draft','ready','posted','failed']},
      {name:'posted_at',label:'Posted date',type:'date'}
    ]} />
  </div>;
}
