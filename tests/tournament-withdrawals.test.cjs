const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {randomUUID}=require('node:crypto');const {load,FakeDB}=require('./payment-helpers.cjs');
function fixture({role='admin',entry={},session={},refund=null}={}){
 const id=randomUUID(),tid=randomUUID(),adminId=randomUUID();const row={id,tournament_id:tid,entry_fee_cents:2000,payment_status:'paid',registration_status:'confirmed',updated_at:'2026-11-01T00:00:00Z',...entry};
 const db=new FakeDB(row,{id:tid});let writes=0,expires=0;db.rpc=async(name,p)=>{writes++;assert.equal(name,'manage_tournament_withdrawal');return {data:{...row,refund_status:p.p_refund?'pending':'not_required'},error:null};};
 const checkout={id:row.stripe_checkout_session_id,status:'complete',payment_status:'paid',currency:'nzd',amount_total:2000,livemode:true,metadata:{type:'tournament_registration',registration_id:id,tournament_id:tid},...session};
 const route=load('app/api/admin/tournament-withdrawals/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>role?{profile:{role},user:{id:adminId}}:null},'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/stripe':{getStripe:()=>({checkout:{sessions:{retrieve:async()=>checkout,expire:async()=>{expires++;}}}})},'@/lib/paymentConfig':{paymentConfiguration:()=>({production:true,mode:'live'})},'@/lib/tournamentRefund':{reconcileTournamentRefund:async()=>refund},'next/cache':{revalidatePath(){}}});
 const post=(patch={})=>route.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({id,action:'withdraw',reason:'Player requested withdrawal',refund:true,...patch})}));
 return {post,db,writes:()=>writes,expires:()=>expires};
}
test('withdrawal API requires admin access, reason and explicit refund choice',async()=>{
 for(const role of [null,'tournament_manager','news_editor']){const f=fixture({role});assert.ok([401,403].includes((await f.post()).status));assert.equal(f.writes(),0);}
 for(const patch of [{reason:'x'},{refund:null},{action:'complete_offline',returned:false}]){const f=fixture();assert.equal((await f.post(patch)).status,400);assert.equal(f.writes(),0);}
});
test('withdrawal retains the payment and calls audited operation; missing setup cannot expire checkout',async()=>{
 const f=fixture();assert.equal((await f.post()).status,200);assert.equal(f.writes(),1);assert.equal(f.db.tables.tournament_registrations.length,1);
 const missing=fixture({entry:{stripe_checkout_session_id:'cs_fixture'}});missing.db.fail={table:'tournament_registrations',op:'select'};assert.equal((await missing.post()).status,503);assert.equal(missing.expires(),0);assert.equal(missing.writes(),0);
});
test('unverified or processing Stripe payments cannot be withdrawn as unpaid',async()=>{
 for(const options of [{entry:{payment_status:'pending_payment',stripe_checkout_session_id:'cs_fixture'}},{entry:{stripe_checkout_session_id:'cs_fixture'},session:{payment_status:'unpaid'}},{entry:{stripe_checkout_session_id:'cs_fixture'},session:{currency:'usd'}}]){const f=fixture(options);assert.ok((await f.post()).status>=400);assert.equal(f.writes(),0);}
});
test('partial or pending Stripe refund never completes a refund request',async()=>{
 const f=fixture({entry:{withdrawn_at:'2026-11-01',refund_status:'pending',stripe_checkout_session_id:'cs_fixture'},refund:null});assert.equal((await f.post({action:'verify_stripe'})).status,409);assert.equal(f.writes(),0);
 const full=fixture({entry:{withdrawn_at:'2026-11-01',refund_status:'pending',stripe_checkout_session_id:'cs_fixture',stripe_payment_intent_id:'pi_fixture'},refund:{stripe_charge_id:'ch_fixture'}});assert.equal((await full.post({action:'verify_stripe'})).status,200);assert.equal(full.writes(),1);
});
test('withdrawal database preserves records, audits once, supports unpaid cancellation and verified offline refunds',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite(),admin=randomUUID(),id=randomUUID(),unpaid=randomUUID(),stripe=randomUUID();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create table profiles(id uuid primary key,role text,is_active boolean);create table tournament_registrations(id uuid primary key,payment_status text,registration_status text,entry_fee_cents integer,updated_at timestamptz,stripe_checkout_session_id text,stripe_payment_intent_id text);create table payment_records(id uuid primary key,reference_id uuid,payment_type text,payment_method text,status text);`);
 const sql=fs.readFileSync('supabase/migrations/20261102_tournament_withdrawals.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.query("insert into profiles values($1,'admin',true)",[admin]);
 await db.query("insert into tournament_registrations values($1,'paid','confirmed',2000,'2026-11-01',null,null),($2,'pending_payment','pending_payment',2000,'2026-11-01',null,null),($3,'paid','confirmed',2000,'2026-11-01','cs_fixture','pi_fixture')",[id,unpaid,stripe]);
 await db.query("insert into payment_records values($1,$1,'tournament','bank_transfer','paid')",[id]);
 const action=(eid,act='withdraw',time='2026-11-01')=>db.query("select manage_tournament_withdrawal($1,$2,$3,'Player withdrawal request','Bank refund 001',true,$4) as entry",[eid,admin,act,time]);
 const [a,b]=await Promise.all([action(id),action(id)]);assert.equal(a.rows[0].entry.registration_status,'cancelled');assert.equal(b.rows[0].entry.refund_status,'pending');assert.equal(a.rows[0].entry.payment_status,'paid');assert.equal((await db.query('select count(*)::int n from tournament_withdrawal_audit')).rows[0].n,1);
 await assert.rejects(db.query('delete from tournament_registrations where id=$1',[id]),/foreign key/);
 const un=(await action(unpaid)).rows[0].entry;assert.equal(un.refund_status,'not_required');assert.equal(un.refund_requested_cents,0);
 await assert.rejects(action(id,'complete_offline','2026-10-01'),/changed/);
 const r=(await action(id,'complete_offline',a.rows[0].entry.updated_at)).rows[0].entry;assert.equal(r.payment_status,'refunded');assert.equal(r.refund_status,'completed');assert.equal(r.refund_reference,'Bank refund 001');await action(id,'complete_offline',r.updated_at);assert.equal((await db.query("select count(*)::int n from tournament_withdrawal_audit where registration_id=$1",[id])).rows[0].n,2);
 const s=(await action(stripe)).rows[0].entry;await assert.rejects(action(stripe,'complete_offline',s.updated_at),/Stripe/);await assert.rejects(action(stripe,'complete_stripe',s.updated_at),/Verify/);
 await db.query("update profiles set role='tournament_manager' where id=$1",[admin]);await assert.rejects(action(stripe),/Admin/);
 assert.equal((await db.query("select status from payment_records where id=$1",[id])).rows[0].status,'refunded');
 assert.equal((await db.query("select has_function_privilege('anon','manage_tournament_withdrawal(uuid,uuid,text,text,text,boolean,timestamptz)','execute') allowed")).rows[0].allowed,false);
 }finally{await db.close();}
});
test('late checkout expiry cannot turn a withdrawn unpaid player back into an active pending entry',async()=>{
 const id=randomUUID(),db=new FakeDB({id,payment_status:'pending_payment',registration_status:'cancelled',stripe_checkout_session_id:'cs_fixture',withdrawn_at:'2026-11-01'},null);
 const previous=process.env.STRIPE_WEBHOOK_SECRET;process.env.STRIPE_WEBHOOK_SECRET='whsec_fixture';
 try{
 const api=load('app/api/stripe/webhook/route.ts',{'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/stripe':{getStripe:()=>({webhooks:{constructEvent:()=>({id:'evt_fixture',type:'checkout.session.expired',data:{object:{id:'cs_fixture',metadata:{type:'tournament_registration',registration_id:id}}}})}})}});
 assert.equal((await api.POST(new Request('https://example.invalid',{method:'POST',headers:{'stripe-signature':'fixture'},body:'{}'}))).status,200);
 assert.equal(db.tables.tournament_registrations[0].registration_status,'cancelled');assert.equal(db.tables.tournament_registrations[0].payment_status,'pending_payment');
 }finally{if(previous===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=previous;}
});
