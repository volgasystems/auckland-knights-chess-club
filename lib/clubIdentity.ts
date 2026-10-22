import { CLUB_NAME, SITE_URL } from "@/lib/seo";
import { clubContactEmail, CLUB_CONTACT_PHONE_LINK } from "@/lib/clubContact";
export function clubSocialLinks(settings: any): [string, string][] {
  const profiles: [string,string,string[]][] = [
    ["Facebook", "facebook_url", ["facebook.com","www.facebook.com"]],
    ["Instagram", "instagram_url", ["instagram.com","www.instagram.com"]],
    ["YouTube", "youtube_url", ["youtube.com","www.youtube.com"]],
    ["Lichess", "lichess_url", ["lichess.org","www.lichess.org"]],
    ["X", "x_url", ["x.com","www.x.com","twitter.com","www.twitter.com"]],
    ["LinkedIn", "linkedin_url", ["linkedin.com","www.linkedin.com"]]
  ];
  return profiles.flatMap(([label,key,hosts])=>{
    try { const url = new URL(String(settings?.[key] || ""));
      return url.protocol === "https:" && !url.username && !url.password && hosts.includes(url.hostname) && url.pathname !== "/" ? [[label,url.href] as [string,string]] : [];
    } catch { return []; }
  });
}
export function clubStructuredData(settings:any) {
  return { "@context":"https://schema.org", "@graph":[
    {"@type":["Organization","SportsOrganization"],"@id":`${SITE_URL}/#club`,name:CLUB_NAME,alternateName:"Auckland Knights",url:SITE_URL,logo:`${SITE_URL}/logo.png`,sport:"Chess",email:clubContactEmail(settings),telephone:CLUB_CONTACT_PHONE_LINK.slice(4),sameAs:clubSocialLinks(settings).map(([,url])=>url),areaServed:["East Auckland","South Auckland"],description:"A community chess club welcoming children, beginners and adults across East Auckland and South Auckland."},
    {"@type":"WebSite","@id":`${SITE_URL}/#website`,name:CLUB_NAME,alternateName:"Auckland Knights",url:SITE_URL,inLanguage:"en-NZ",publisher:{"@id":`${SITE_URL}/#club`}}
  ]};
}
