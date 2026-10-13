const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {randomUUID}=require('node:crypto');const {load,FakeDB}=require('./payment-helpers.cjs');
const id=randomUUID(),event=randomUUID(),adminId=randomUUID();
const entry={id,tournament_id:event,entry_fee_cents:2000,payment_status:'pending_payment',registration_status:'pending_payment',updated_at:'2026-10-13T00:00:00Z'};
function setup({role='admin',signedIn=true,session,setupMissing=false}={}){
 const db=new FakeDB({...entry,stripe_checkout_session_id:session?.id},{id:event,title:'Test tournament'});let calls=0,expired=0;
 db.rpc=async(name,args)=>{calls++;assert.equal(args.p_admin_id,adminId);return {data:{...entry,payment_status:'paid',registration_status:'confirmed'},error:null};};
 if(setupMissing)db.fail={table:'payment_records',op:'select'};
 const api=load('app/api/admin/payments/manual-confirm/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>signedIn?{profile:{role},user:{id:adminId}}:null},'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/stripe':{getStripe:()=>({checkout:{sessions:{retrieve:async()=>session,expire:async()=>{expired++;}}}})},'@/lib/tournamentPayment':{tryTournamentConfirmation:async()=> 'sent',confirmTournamentPayment:async()=>({status:'confirmed',email_status:'sent'})},'@/lib/tournamentRefund':{reconcileTournamentRefund:async()=>null},'@/lib/paymentConfig':{paymentConfiguration:()=>({production:true,mode:'live'})},'next/cache':{revalidatePath(){}}});
 return {api,db,calls:()=>calls,expired:()=>expired};
}
function request(patch={}){return new Request('https://example.invalid',{method:'POST',body:JSON.stringify({registration_id:id,method:'cash',note:'Cash receipt 001',received:true,...patch})});}
const checkout={id:'cs_test',status:'open',payment_status:'unpaid',currency:'nzd',amount_total:2000,livemode:true,metadata:{type:'tournament_registration',registration_id:id,tournament_id:event}};
test('manual confirmation requires active admin access and payment acknowledgement',async()=>{for(const options of [{role:'tournament_manager'},{role:'news_editor'},{signedIn:false}]){const a=setup(options);assert.ok([401,403].includes((await a.api.POST(request())).status));assert.equal(a.calls(),0);}for(const patch of [{received:false},{method:'stripe'},{note:'x'}]){const a=setup();assert.equal((await a.api.POST(request(patch))).status,400);assert.equal(a.calls(),0);}});
test('cash approval calls atomic audited operation after expiring unpaid checkout',async()=>{const a=setup({session:checkout});assert.equal((await a.api.POST(request())).status,200);assert.equal(a.expired(),1);assert.equal(a.calls(),1);});
test('processing Stripe payment and missing migration cannot expire a checkout or approve offline',async()=>{for(const options of [{session:{...checkout,status:'complete'}},{session:checkout,setupMissing:true},{session:{...checkout,metadata:{...checkout.metadata,registration_id:randomUUID()}}}]){const a=setup(options);assert.ok((await a.api.POST(request())).status>=400);assert.equal(a.expired(),0);assert.equal(a.calls(),0);}});
test('completed Stripe payment is verified rather than recorded as cash',async()=>{const a=setup({session:{...checkout,status:'complete',payment_status:'paid'}});assert.equal((await a.api.POST(request())).status,200);assert.equal(a.expired(),0);assert.equal(a.calls(),0);});
test('database approval is atomic, audited, idempotent and rejects cancelled entries and races',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id uuid primary key,role text,is_active boolean);
 create table tournament_registrations(id uuid primary key,tournament_id uuid,email text,entry_fee_cents integer,payment_status text,registration_status text,updated_at timestamptz);
 create table payment_records(id uuid primary key,payment_type text,reference_id uuid,email text,amount_cents integer,status text);
 `);
 const sql=fs.readFileSync('supabase/migrations/20261013_manual_tournament_payments.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.query("insert into profiles values($1,'admin',true)",[adminId]);
 await db.query("insert into tournament_registrations values($1,$2,'test@example.invalid',2000,'pending_payment','pending_payment',$3)",[id,event,entry.updated_at]);
 const approve=(note='Receipt 001',time=entry.updated_at)=>db.query('select confirm_manual_tournament_payment($1,$2,$3,$4,$5) as entry',[id,adminId,'cash',note,time]);
 await assert.rejects(approve('Receipt 001','2026-10-12T00:00:00Z'));
 assert.equal((await db.query('select count(*) as n from payment_records')).rows[0].n,0);
 const results=await Promise.all([approve(),approve('A retry note')]);for(const r of results)assert.equal(r.rows[0].entry.registration_status,'confirmed');
 const receipts=await db.query('select * from payment_records');assert.equal(receipts.rows.length,1);assert.equal(receipts.rows[0].confirmed_by,adminId);assert.equal(receipts.rows[0].payment_method,'cash');assert.equal(receipts.rows[0].confirmation_note,'Receipt 001');assert.equal(receipts.rows[0].amount_cents,2000);
 await db.query("update tournament_registrations set payment_status='refunded',registration_status='cancelled' where id=$1",[id]);await assert.rejects(approve());
 await db.query("update profiles set role='tournament_manager' where id=$1",[adminId]);await assert.rejects(approve());
 } finally {await db.close();}
});
