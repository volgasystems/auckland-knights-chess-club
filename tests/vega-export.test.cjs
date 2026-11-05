const {test}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');const {load,FakeDB}=require('./payment-helpers.cjs');
test('Vega download isolates a tournament and paid confirmed players; normal CSV respects every selected column',async()=>{
 const id=randomUUID(),other=randomUUID(),db=new FakeDB();const player={tournament_id:id,first_name:'Fixture',last_name:'Player',gender:'Female',date_of_birth:'2010-01-01',payment_status:'paid',registration_status:'confirmed',fide_id:'1234',phone:'PRIVATE',email:'fixture@example.invalid',tournaments:{title:'Rapid Open'}};
 db.tables.tournament_registrations=[player,{...player,tournament_id:other,last_name:'Other'},{...player,last_name:'Pending',payment_status:'pending_payment'},{...player,last_name:'Withdrawn',registration_status:'cancelled'}];
 const api=load('app/api/admin/export/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>({profile:{role:'admin'}})},'@/lib/roles':{canAccess:()=>true},'@/lib/supabase/service':{createSupabaseServiceClient:()=>db}});
 const get=(qs)=>api.GET(new Request('https://example.invalid/api/admin/export?type=tournament_registrations&'+qs));
 assert.equal((await get('format=vega')).status,400);
 const res=await get('format=vega&tournament_id='+id+'&entries=all');assert.equal(res.status,200);
 const csv=await res.text();assert.equal(csv.split('\n').length,2);assert.equal(csv.split('\n')[0], "Name,Fed,Birth date,G,Title,ID FIDE,Rtg FIDE,K FIDE,ID Nat,Rtg Nat,K Nat,Origin,S,Info");assert.equal(csv.split('\n')[1], '"Player, Fixture",,2010,F,,1234,0,0,0,0,0,,,');assert.doesNotMatch(csv,/PRIVATE|example.invalid|Withdrawn|Other|Pending/);
 const report=await (await get('format=csv&tournament_id='+id+'&payment_status=pending_payment&columns=player&columns=gender&columns=dob')).text();
 assert.match(report.split('\n')[0],/Name,Gender,DOB/);assert.match(report,/Pending/);assert.doesNotMatch(report,/Withdrawn|Other/);
});
