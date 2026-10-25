import { dashboardAnalytics, nzDay, paymentBucket, shiftDay } from "@/lib/dashboardAnalytics";
const normal=(v:unknown)=>String(v||"").normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase();
const paid=(r:any)=>["paid","manual_paid"].includes(r.status);
const cents=(r:any)=>Number.isSafeInteger(Number(r.amount_cents))&&Number(r.amount_cents)>0?Number(r.amount_cents):0;
export function dashboardOverview({members=[],entries=[],payments=[],events=[],enquiries=[],absences=[]}:{members?:any[];entries?:any[];payments?:any[];events?:any[];enquiries?:any[];absences?:any[]},days=30,tournamentId="",now=new Date()) {
 const base=dashboardAnalytics(members,entries,payments,days,tournamentId,now);
 const inPeriod=(v:any)=>{const day=nzDay(v);return !!day&&day>=base.start&&day<=base.today;};
 const retained=(r:any)=>!r.created_at||!nzDay(r.created_at)||nzDay(r.created_at)<=base.today;
 members=members.filter(retained);entries=entries.filter(retained);events=events.filter(retained);enquiries=enquiries.filter(retained);absences=absences.filter(retained);
 const period=(rows:any[])=>rows.filter(r=>inPeriod(r.created_at));
 const previous=(rows:any[])=>rows.filter(r=>{const d=nzDay(r.created_at);return d&&d>=shiftDay(base.start,-base.days)&&d<base.start;}).length;
 const keys=events.reduce((map:Map<string,any[]>,e:any)=>{const key=normal(e.title);map.set(key,[...(map.get(key)||[]),e]);return map;},new Map<string,any[]>());
 function eventFor(a:any):string|null {if(a.tournament_id&&events.some(e=>e.id===a.tournament_id))return a.tournament_id;const matches=keys.get(normal(a.tournament_name))||[];return matches.length===1?matches[0].id:null;}
 const mapped=absences.map(a=>({...a,matchedEvent:eventFor(a)}));
 const scopedAbsences=mapped.filter(a=>!tournamentId||a.matchedEvent===tournamentId);
 const scopedEntries=entries.filter(r=>!tournamentId||r.tournament_id===tournamentId);
 const entryIds=new Set(scopedEntries.map(r=>r.id));
 const memberReceipts=payments.filter(p=>p.payment_type==="membership");
 const tourReceipts=payments.filter(p=>p.payment_type==="tournament"&&(!tournamentId||entryIds.has(p.reference_id)));
 const money=(rows:any[])=>({received:rows.filter(paid).reduce((n,r)=>n+cents(r),0),periodReceived:period(rows).filter(paid).reduce((n,r)=>n+cents(r),0),paidCount:rows.filter(paid).length,refunded:rows.filter(r=>r.status==="refunded").reduce((n,r)=>n+cents(r),0)});
 const buckets=(rows:any[])=>rows.reduce((b:Record<string,number>,r:any)=>{b[paymentBucket(r)]++;return b;},{paid:0,pending:0,cancelled:0,other:0});
 const memberBuckets=buckets(members.map(m=>({...m,registration_status:m.membership_status==="cancelled"?"cancelled":undefined})));
 const memberSummary={total:members.length,newCount:period(members).length,previousCount:previous(members),active:members.filter(m=>m.membership_status==="active"&&["paid","manual_paid","waived"].includes(m.payment_status)&&m.membership_end_date>=base.today).length,status:memberBuckets,...money(memberReceipts)};
 const tourSummary={total:scopedEntries.length,newCount:period(scopedEntries).length,previousCount:previous(scopedEntries),confirmed:scopedEntries.filter(r=>paymentBucket(r)==="paid"&&r.registration_status==="confirmed").length,status:buckets(scopedEntries),periodStatus:buckets(period(scopedEntries)),...money(tourReceipts)};
 const enquiryStatuses=enquiries.reduce((m:Record<string,number>,r:any)=>{const key=["new","in_progress","responded","closed"].includes(r.status)?r.status:"other";m[key]=(m[key]||0)+1;return m;},{new:0,in_progress:0,responded:0,closed:0,other:0});
 const enquirySummary={total:enquiries.length,newCount:period(enquiries).length,previousCount:previous(enquiries),status:enquiryStatuses,latest:enquiries.filter(e=>e.status==="new").sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,8).map(e=>({id:e.id,subject:e.subject||"Untitled enquiry",type:e.enquiry_type||"General enquiry",created_at:e.created_at}))};
 const uniquePlayers=(rows:any[])=>new Set(rows.map(a=>`${normal(a.player_first_name)}|${normal(a.player_last_name)}|${normal(a.email)}`)).size;
 const absenceSummary={total:scopedAbsences.length,newCount:period(scopedAbsences).length,players:uniquePlayers(scopedAbsences),newStatus:scopedAbsences.filter(a=>a.status==="new").length,reviewed:scopedAbsences.filter(a=>["reviewed","noted"].includes(a.status)).length,unmatched:mapped.filter(a=>!a.matchedEvent).length};
 const eventSummary={total:events.length,newCount:period(events).length,scheduled:events.filter(e=>inPeriod(e.start_date)).length,upcoming:events.filter(e=>["open","closed"].includes(e.status)&&Date.parse(e.start_date)>=now.getTime()).length,open:events.filter(e=>e.status==="open").length,completed:events.filter(e=>e.status==="completed").length,drafts:events.filter(e=>e.status==="draft").length};
 const eventRows=events.filter(e=>!tournamentId||e.id===tournamentId).map(e=>{
  const regs=entries.filter(r=>r.tournament_id===e.id),ids=new Set(regs.map(r=>r.id)),abs=mapped.filter(a=>a.matchedEvent===e.id),receipts=payments.filter(p=>p.payment_type==="tournament"&&ids.has(p.reference_id));
  return {id:e.id,title:e.title,slug:e.slug,status:e.status,start_date:e.start_date,type:e.tournament_type,entries:regs.length,newEntries:period(regs).length,confirmed:regs.filter(r=>paymentBucket(r)==="paid"&&r.registration_status==="confirmed").length,pending:regs.filter(r=>paymentBucket(r)==="pending").length,cancelled:regs.filter(r=>paymentBucket(r)==="cancelled").length,...money(receipts),absences:abs.length,newAbsences:period(abs).length,absentPlayers:uniquePlayers(abs)};
 }).sort((a,b)=>b.entries-a.entries||String(a.title).localeCompare(String(b.title)));
 const rounds=new Map<string,{eventId:string|null;tournament:string;round:string;date:string;reports:number;players:number;newStatus:number;identities:Set<string>}>();
 for(const a of scopedAbsences){const key=`${a.matchedEvent||normal(a.tournament_name)}|${a.round_number}|${a.round_date}`;const row=rounds.get(key)||{eventId:a.matchedEvent,tournament:a.matchedEvent?events.find(e=>e.id===a.matchedEvent)!.title:a.tournament_name,round:String(a.round_number),date:String(a.round_date),reports:0,players:0,newStatus:0,identities:new Set<string>()};row.reports++;if(a.status==="new")row.newStatus++;row.identities.add(`${normal(a.player_first_name)}|${normal(a.player_last_name)}|${normal(a.email)}`);row.players=row.identities.size;rounds.set(key,row);}
 let countEvents=0,countEnquiries=0,countAbsences=0;
 const before=(rows:any[])=>rows.filter(r=>{const d=nzDay(r.created_at);return d&&d<base.start;}).length;
 countEvents=before(events);countEnquiries=before(enquiries);countAbsences=before(scopedAbsences);
 const daily=base.daily.map(day=>{const created=(rows:any[])=>rows.filter(r=>nzDay(r.created_at)===day.date).length;const eventsCreated=created(events),enquiriesReceived=created(enquiries),absenceReports=created(scopedAbsences);countEvents+=eventsCreated;countEnquiries+=enquiriesReceived;countAbsences+=absenceReports;return {...day,events:eventsCreated,enquiries:enquiriesReceived,absences:absenceReports,totalEvents:countEvents,totalEnquiries:countEnquiries,totalAbsences:countAbsences};});
 return {...base,daily,membership:memberSummary,tournament:tourSummary,events:eventSummary,enquiries:enquirySummary,absences:absenceSummary,eventRows,roundRows:[...rounds.values()].map(({identities,...r})=>r).sort((a,b)=>a.date.localeCompare(b.date)||a.tournament.localeCompare(b.tournament)||a.round.localeCompare(b.round,undefined,{numeric:true})),selectedTitle:events.find(e=>e.id===tournamentId)?.title||"All tournaments",filtered:!!tournamentId};
}
