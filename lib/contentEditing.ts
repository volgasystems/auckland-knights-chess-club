export function formatSelection(value:string,start:number,end:number,kind:string) {
  const selected=value.slice(start,end) || "Text";
  let text=selected;
  if(kind==="bold") text=`**${selected}**`;
  if(kind==="italic") text=`*${selected}*`;
  if(kind==="heading") text=`## ${selected}`;
  if(kind==="quote") text=selected.split("\n").map(line=>`> ${line}`).join("\n");
  if(kind==="bullet") text=selected.split("\n").map(line=>`- ${line}`).join("\n");
  if(kind==="number") text=selected.split("\n").map((line,i)=>`${i+1}. ${line}`).join("\n");
  if(kind==="link") text=`[${selected}](https://)`;
  if(kind==="table") text="| Heading | Heading |\n| --- | --- |\n| Text | Text |";
  if(["heading","quote","bullet","number","table"].includes(kind)) {
    if(start>0 && value[start-1]!=="\n") text="\n"+text;
    if(end<value.length && value[end]!=="\n") text+="\n";
  }
  return {value:value.slice(0,start)+text+value.slice(end),start,end:start+text.length};
}
export const CONTENT_PREVIEW_TABLES = ["news_posts","coaches","coaching_topics","social_posts","agm_meetings","agm_decisions","elected_team_members"];
