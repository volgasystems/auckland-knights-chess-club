const DAY = 86400000;
export type DailyActivity = { date:string; members:number; registrations:number; totalMembers:number; totalRegistrations:number; membershipCents:number; tournamentCents:number; events:number; enquiries:number; absences:number; totalEvents:number; totalEnquiries:number; totalAbsences:number };
export function nzDay(value: string | Date | number) {
  if(value == null || value === "") return "";
  const d = new Date(value); if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Pacific/Auckland",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
}
export function shiftDay(day:string, offset:number) { return new Date(Date.parse(`${day}T12:00:00Z`)+offset*DAY).toISOString().slice(0,10); }
export function dashboardRange(value:unknown) { const n=Number(value);return [7,30,90].includes(n)?n:30; }
export async function dashboardRows(s:any, table:string, columns:string) {
  const rows:any[]=[];
  for(let start=0;;start+=1000){
    const result=await s.from(table).select(columns).order("created_at",{ascending:true}).order("id",{ascending:true}).range(start,start+999);
    if(result.error) throw new Error(`Dashboard data unavailable: ${table}`);
    rows.push(...(result.data||[]));if((result.data||[]).length<1000) return rows;
  }
}
export function paymentBucket(r:any) {
  if(r.payment_status === "refunded" || r.registration_status === "cancelled") return "cancelled";
  if(["paid","manual_paid","waived"].includes(r.payment_status)) return "paid";
  if(["pending_payment","failed","expired"].includes(r.payment_status)) return "pending";
  return "other";
}
export function dashboardAnalytics(members:any[], entries:any[], payments:any[], days=30, tournamentId="", now=new Date()) {
  days=dashboardRange(days);
  const today=nzDay(now),start=shiftDay(today,1-days),previousStart=shiftDay(start,-days);
  const regs=tournamentId?entries.filter(r=>r.tournament_id===tournamentId):entries;
  const ids=new Set(regs.map(r=>r.id));
  const daily:DailyActivity[]=Array.from({length:days},(_,i)=>({date:shiftDay(start,i),members:0,registrations:0,totalMembers:0,totalRegistrations:0,membershipCents:0,tournamentCents:0,events:0,enquiries:0,absences:0,totalEvents:0,totalEnquiries:0,totalAbsences:0}));
  const byDay=new Map(daily.map(d=>[d.date,d]));let baseMembers=0,baseRegistrations=0,previousRegistrations=0;
  const status={paid:0,pending:0,cancelled:0,other:0};
  for(const member of members){const date=nzDay(member.created_at);if(!date||date>today)continue;if(date<start)baseMembers++;else byDay.get(date)!.members++;}
  for(const r of regs){const date=nzDay(r.created_at);if(!date||date>today)continue;if(date<start){baseRegistrations++;if(date>=previousStart)previousRegistrations++;}else{byDay.get(date)!.registrations++;status[paymentBucket(r)]++;}}
  for(const p of payments){
    if(!["paid","manual_paid"].includes(p.status))continue;
    const date=nzDay(p.created_at),row=byDay.get(date),amount=Number(p.amount_cents);
    if(!row||!Number.isSafeInteger(amount)||amount<=0)continue;
    if(p.payment_type==="membership")row.membershipCents+=amount;
    if(p.payment_type==="tournament"&&(!tournamentId||ids.has(p.reference_id)))row.tournamentCents+=amount;
  }
  for(const row of daily){baseMembers+=row.members;baseRegistrations+=row.registrations;row.totalMembers=baseMembers;row.totalRegistrations=baseRegistrations;}
  const registrations=daily.reduce((n,r)=>n+r.registrations,0),newMembers=daily.reduce((n,r)=>n+r.members,0);
  const receivedCents=daily.reduce((n,r)=>n+r.membershipCents+r.tournamentCents,0);
  const peak=daily.reduce((best,row)=>row.registrations>best.registrations?row:best,daily[0]);
  return {days,start,today,daily,status,registrations,newMembers,previousRegistrations,receivedCents,peakDate:peak.registrations?peak.date:null,peakCount:peak.registrations};
}
