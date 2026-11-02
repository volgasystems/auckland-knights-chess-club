const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {randomUUID}=require('node:crypto');const {load,FakeDB}=require('./payment-helpers.cjs');
test('manual membership confirmation supports cash/bank/verified payment without permitting non-admins or cancelled memberships',async()=>{
 for(const method of ['cash','bank_transfer','verified_other'])for(const role of ['admin','tournament_manager']){
 const id=randomUUID(),db=new FakeDB();db.tables.club_memberships=[{id,email:'fixture@example.invalid',payment_status:'pending_payment',membership_status:'pending_payment',total_amount_cents:6000}];let calls=0;
 db.rpc=async(n,p)=>{assert.equal(n,'confirm_manual_membership_payment');assert.equal(p.p_method,method);calls++;return {data:{id,payment_status:'paid'}};};
 const api=load('app/api/admin/payments/membership-bank-confirm/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>({profile:{role},user:{id:randomUUID()}})},'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/membershipPayment':{activateMembership:async()=>({status:'confirmed'})},'next/cache':{revalidatePath(){}}});
 const req=()=>new Request('https://example.invalid',{method:'POST',body:JSON.stringify({registration_id:id,method,note:'Verified receipt 001',received:true})});
 assert.equal((await api.POST(req())).status,role==='admin'?200:403);assert.equal(calls,role==='admin'?1:0);
 db.tables.club_memberships[0].membership_status='cancelled';assert.ok((await api.POST(req())).status>=400);
 }
});
test('membership withdrawal API checks receipt ownership and offline return acknowledgement',async()=>{
 const id=randomUUID(),db=new FakeDB();db.tables.club_memberships=[{id,membership_status:'active',payment_status:'paid'}];let calls=0;db.rpc=async()=>{calls++;return{data:{refund_status:'not_required'}};};
 const api=load('app/api/admin/membership-withdrawals/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>({profile:{role:'admin'},user:{id:randomUUID()}})},'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/membershipAdminPayment':{stopMembershipCheckouts:async()=>{}},'next/cache':{revalidatePath(){}}});
 const req=(patch={})=>new Request('https://example.invalid',{method:'POST',body:JSON.stringify({id,action:'withdraw',refund:false,reason:'Member requested cancellation',...patch})});
 assert.equal((await api.POST(req())).status,200);assert.equal(calls,1);
 assert.equal((await api.POST(req({receipt_id:randomUUID(),refund:true}))).status,409);
 assert.equal((await api.POST(req({action:'complete_offline',returned:false}))).status,400);assert.equal(calls,1);
});
test('membership SQL preserves IDs, audits manual payments, targets original/renewal receipts and prevents duplicate refunds',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite(),id=randomUUID(),other=randomUUID(),admin=randomUUID(),renewal=randomUUID();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id uuid primary key,role text,is_active boolean);
 create table club_memberships(id uuid primary key,membership_id text,email text,payment_status text,membership_status text,total_amount_cents integer,updated_at timestamptz,stripe_checkout_session_id text,stripe_payment_intent_id text);
 create table payment_records(id uuid primary key,payment_type text,reference_id uuid,email text,amount_cents integer,status text,stripe_checkout_session_id text,stripe_payment_intent_id text);
 create table membership_renewals(id uuid primary key,member_id uuid,status text);`);
 const sql=fs.readFileSync('supabase/migrations/20261102_membership_payments_withdrawals.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.query("insert into profiles values($1,'admin',true)",[admin]);
 await db.query("insert into club_memberships values($1,'AKCC123','fixture@example.invalid','pending_payment','pending_payment',6000,'2026-11-02',null,null),($2,'AKCC999','other@example.invalid','paid','active',1000,'2026-11-02',null,null)",[id,other]);
 const approve=()=>db.query("select confirm_manual_membership_payment($1,$2,'cash','Cash receipt 001','2026-11-02') as member",[id,admin]);
 await Promise.all([approve(),approve()]);assert.equal((await db.query('select count(*)::int n from payment_records')).rows[0].n,1);
 assert.equal((await db.query('select membership_id from club_memberships where id=$1',[id])).rows[0].membership_id,'AKCC123');
 const current=async()=> (await db.query('select * from club_memberships where id=$1',[id])).rows[0];
 const action=async(act,rid=id,time)=>(await db.query("select manage_membership_withdrawal($1,$2,$3,'Member requested cancellation','Refund reference 001',true,$4,$5) as member",[id,admin,act,rid,time??(await current()).updated_at])).rows[0].member;
 const w=await action('withdraw');assert.equal(w.membership_status,'cancelled');assert.equal(w.payment_status,'paid');assert.equal(w.refund_requested_cents,6000);
 await assert.rejects(approve(),/Cancelled/);await assert.rejects(db.query('delete from club_memberships where id=$1',[id]),/foreign key/);
 await assert.rejects(action('complete_offline',id,'2026-10-01'),/changed/);
 const done=await action('complete_offline');await action('complete_offline');assert.equal(done.refund_status,'completed');assert.equal(done.payment_status,'refunded');assert.equal((await db.query("select count(*)::int n from membership_payment_audit where action='complete_offline'")).rows[0].n,1);
 await db.query("insert into payment_records(id,payment_type,reference_id,email,amount_cents,status,stripe_checkout_session_id,stripe_payment_intent_id) values($1,'membership',$2,'fixture@example.invalid',8000,'paid','cs_renewal','pi_renewal')",[renewal,id]);
 await db.query("insert into membership_renewals values($1,$2,'paid')",[renewal,id]);
 const next=await action('request_refund',renewal);assert.equal(next.refund_requested_cents,8000);await assert.rejects(action('complete_offline',renewal),/Stripe/);
 await action('complete_stripe',renewal);assert.equal((await db.query('select status from membership_renewals where id=$1',[renewal])).rows[0].status,'refunded');assert.equal((await current()).membership_id,'AKCC123');
 assert.equal((await db.query('select count(*)::int n from payment_records')).rows[0].n,2);
 assert.equal((await db.query("select has_function_privilege('anon','manage_membership_withdrawal(uuid,uuid,text,text,text,boolean,uuid,timestamptz)','execute') allowed")).rows[0].allowed,false);
 }finally{await db.close();}
});
test('renewal and initial Stripe checkout metadata and mode are validated against the chosen receipt',()=>{
 const f=load('lib/membershipAdminPayment.ts',{'@/lib/paymentConfig':{paymentConfiguration:()=>({production:true,mode:'live'})}});const m={id:'member',stripe_checkout_session_id:'cs_initial',total_amount_cents:6000};
 const receipt={id:'renewal',stripe_checkout_session_id:'cs_renewal',amount_cents:8000};const s={id:'cs_renewal',mode:'payment',currency:'nzd',amount_total:8000,livemode:true,metadata:{type:'membership_renewal',membership_id:'member',renewal_id:'renewal'}};
 f.validateMembershipCheckout(s,m,receipt);assert.throws(()=>f.validateMembershipCheckout({...s,livemode:false},m,receipt));assert.throws(()=>f.validateMembershipCheckout({...s,metadata:{...s.metadata,renewal_id:'wrong'}},m,receipt));
});
test('membership Stripe refunds require successful full matching charge and never issue a money transfer',async()=>{
 for(const change of [{},{refunded:false,amount_refunded:1000},{currency:'usd'},{livemode:false},{payment_intent:'pi_wrong'},{amount:1}]){
  const id=randomUUID(),rid=randomUUID(),db=new FakeDB();db.tables.club_memberships=[{id,withdrawn_at:'2026-11-02',membership_status:'cancelled',refund_status:'pending',refund_payment_record_id:rid}];db.tables.payment_records=[{id:rid,reference_id:id,payment_type:'membership',amount_cents:6000,status:'paid',stripe_payment_intent_id:'pi_fixture'}];let writes=0;db.rpc=async(n,p)=>{writes++;assert.equal(p.p_receipt_id,rid);assert.equal(p.p_reference,'ch_fixture');return{data:{}};};
  const charge={id:'ch_fixture',payment_intent:'pi_fixture',paid:true,refunded:true,amount:6000,amount_refunded:6000,currency:'nzd',livemode:true,...change};
  const api=load('app/api/admin/membership-withdrawals/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>({profile:{role:'admin'},user:{id:randomUUID()}})},'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/stripe':{getStripe:()=>({charges:{list:async()=>({data:[charge]})}})},'@/lib/paymentConfig':{paymentConfiguration:()=>({production:true,mode:'live'})},'next/cache':{revalidatePath(){}}});
  const r=await api.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({id,receipt_id:rid,action:'verify_stripe',reason:'Member full refund request'})}));
  assert.equal(writes,Object.keys(change).length?0:1);assert.equal(r.status===200,Object.keys(change).length===0);
 }
});
test('membership cash approval expires open checkout, holds processing/refunded payments, and verifies completed Stripe instead',async()=>{
 for(const state of ['open','processing','paid','refunded']){
 const id=randomUUID(),db=new FakeDB();db.tables.club_memberships=[{id,email:'fixture@example.invalid',payment_status:'pending_payment',membership_status:'pending_payment',total_amount_cents:6000,stripe_checkout_session_id:'cs_fixture'}];let expired=0,approvals=0,verified=0;
 db.rpc=async()=>{approvals++;return{data:{id,payment_status:'paid'}};};
 const session={id:'cs_fixture',mode:'payment',status:state==='open'?'open':'complete',payment_status:['paid','refunded'].includes(state)?'paid':'unpaid',currency:'nzd',amount_total:6000,livemode:true,payment_intent:'pi_fixture',metadata:{type:'membership',membership_id:id}};
 const api=load('app/api/admin/payments/membership-bank-confirm/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>({profile:{role:'admin'},user:{id:randomUUID()}})},'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/stripe':{getStripe:()=>({checkout:{sessions:{retrieve:async()=>session,expire:async()=>{expired++;}}},charges:{list:async()=>({data:state==='refunded'?[{amount_refunded:6000}]:[]})}})},'@/lib/paymentConfig':{paymentConfiguration:()=>({production:true,mode:'live'})},'@/lib/membershipPayment':{activateMembership:async()=>({status:'confirmed'}),confirmMembershipPayment:async()=>{verified++;return {status:'confirmed'};}},'next/cache':{revalidatePath(){}}});
 const r=await api.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({registration_id:id,method:'cash',note:'Cash receipt fixture',received:true})}));
 assert.equal(approvals,state==='open'?1:0);assert.equal(expired,state==='open'?1:0);assert.equal(verified,state==='paid'?1:0);assert.equal(r.status===200,['open','paid'].includes(state));
 }
});
