const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {randomUUID}=require('node:crypto');const {load,FakeDB}=require('./payment-helpers.cjs');
process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-secret-never-use';process.env.STRIPE_SECRET_KEY='sk_live_fixture';process.env.STRIPE_WEBHOOK_SECRET='whsec_fixture';process.env.VERCEL_ENV='production';process.env.NEXT_PUBLIC_SITE_URL='https://www.aucklandknights.co.nz';
test('membership access expires and rejects modified tokens and signatures',()=>{const a=load('lib/membershipAccess.ts');const member={id:randomUUID(),email:'FAMILY@example.invalid'};const token=a.memberAccessToken(member,1000);assert.equal(a.readMemberAccessToken(token,1001).email,'family@example.invalid');assert.equal(a.readMemberAccessToken(token,1801000),null);assert.equal(a.readMemberAccessToken(token+'extra',1001),null);assert.equal(a.readMemberAccessToken('x'+token,1001),null);assert.equal(a.recoveryClaim('family@example.invalid',1000),a.recoveryClaim('family@example.invalid',2000));assert.notEqual(a.recoveryClaim('family@example.invalid',1000),a.recoveryClaim('family@example.invalid',61000));});
test('renewal checkout rejects expired access before database or Stripe calls',async()=>{const route=load('app/api/membership/renew/route.ts',{'@/lib/supabase/service':{createSupabaseServiceClient(){throw Error('no access');}},'@/lib/stripe':{}});assert.equal((await route.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({member_token:'invalid'})}))).status,401);});
test('renewal validates exact payment, mode and checkout and uses renewal-specific email and receipt',async()=>{
 const renewal={id:randomUUID(),member_id:randomUUID(),amount_cents:8000,stripe_checkout_session_id:'cs_live_renewfixture'};const db=new FakeDB();db.tables.membership_renewals=[renewal];let applies=0,sends=[];db.rpc=async()=>{applies++;return {data:{id:renewal.member_id,membership_id:'AKCC01001',email:'player@example.invalid',renewal_end_date:'2027-12-31'},error:null};};
 const mod=load('lib/membershipRenewal.ts',{'@/lib/membershipPayment':{sendMembershipConfirmation:async(s,m,id)=>{sends.push(id);return 'sent';}}});
 const session={id:renewal.stripe_checkout_session_id,mode:'payment',status:'complete',payment_status:'paid',currency:'nzd',amount_total:8000,livemode:true,metadata:{type:'membership_renewal',membership_id:renewal.member_id,renewal_id:renewal.id}};
 for(const patch of [{amount_total:1},{livemode:false},{id:'cs_live_other'},{payment_status:'unpaid'},{metadata:{...session.metadata,membership_id:randomUUID()}}])await assert.rejects(mod.confirmMembershipRenewal(db,{...session,...patch}));assert.equal(applies,0);
 const result=await mod.confirmMembershipRenewal(db,session);assert.equal(result.membership_id,'AKCC01001');assert.equal(result.membership_end_date,'2027-12-31');assert.equal(sends[0],renewal.id);assert.equal(db.tables.payment_records[0].id,renewal.id);
});
test('renewal migration keeps ID, extends once under concurrent replays, and protects cancelled members',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create table club_memberships(id uuid primary key,membership_id text,email text,payment_status text,membership_status text,membership_end_date date,membership_options jsonb,renewal_notice_sent_at timestamptz,updated_at timestamptz);`);
 await db.exec(fs.readFileSync('supabase/migration_v4_6_membership_renewals.sql','utf8'));
 const member=randomUUID(),renewal=randomUUID();await db.query("insert into club_memberships values($1,'AKCC01001','player@example.invalid','paid','active','2030-12-31',null,null,now())",[member]);
 await db.query("insert into membership_renewals(id,member_id,option_key,option_name,amount_cents,valid_until_month,stripe_checkout_session_id)values($1,$2,'annual','Annual',8000,12,'cs_live_fixture')",[renewal,member]);
 await assert.rejects(db.query("select apply_membership_renewal($1,'cs_live_wrong','pi_fixture')",[renewal]));
 const replay=await Promise.all([1,2].map(()=>db.query("select apply_membership_renewal($1,'cs_live_fixture','pi_fixture') as member",[renewal])));for(const r of replay){assert.equal(r.rows[0].member.membership_id,'AKCC01001');assert.equal(r.rows[0].member.renewal_end_date,'2031-12-31');}
 const next=randomUUID();await db.query("insert into membership_renewals(id,member_id,option_key,option_name,amount_cents,validity_months,stripe_checkout_session_id)values($1,$2,'rolling','Rolling',8000,6,'cs_live_second')",[next,member]);const result=(await db.query("select apply_membership_renewal($1,'cs_live_second','pi_second') as member",[next])).rows[0].member;assert.equal(result.renewal_end_date,'2032-06-30');
 const expired=randomUUID(),expiredRenewal=randomUUID();await db.query("insert into club_memberships values($1,'AKCC01002','expired@example.invalid','paid','expired','2020-12-31',null,null,now())",[expired]);await db.query("insert into membership_renewals(id,member_id,option_key,option_name,amount_cents,validity_months,stripe_checkout_session_id)values($1,$2,'rolling','Rolling',8000,12,'cs_live_expired')",[expiredRenewal,expired]);const restored=(await db.query("select apply_membership_renewal($1,'cs_live_expired','pi_expired') as member",[expiredRenewal])).rows[0].member;assert.equal(restored.membership_status,'active');assert.ok(restored.renewal_end_date>'2026-12-31');
 await db.query("update club_memberships set membership_status='cancelled' where id=$1",[member]);await assert.rejects(db.query("select apply_membership_renewal($1,'cs_live_second','pi_second')",[next]));
 const grants=(await db.query("select has_function_privilege('anon','apply_membership_renewal(uuid,text,text)','EXECUTE') as anon,has_function_privilege('service_role','apply_membership_renewal(uuid,text,text)','EXECUTE') as service")).rows[0];assert.equal(grants.anon,false);assert.equal(grants.service,true);await db.close();
});
test('public lookup emails matching family IDs without disclosing records in the response and throttles repeats',async()=>{
 const db=new FakeDB();const member={id:randomUUID(),email:'family@example.invalid',membership_id:'AKCC01001',last_name:'Player',payment_status:'paid',membership_status:'active'};db.tables.club_memberships=[member,{...member,id:randomUUID(),membership_id:'AKCC01002'}];let sends=[];
 const route=load('app/api/membership/recovery/route.ts',{'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/email':{sendEmail:async m=>sends.push(m)}});
 const req=()=>new Request('https://example.invalid',{method:'POST',body:JSON.stringify({email:member.email,surname:'Player'})});const response=await route.POST(req());const body=await response.json();assert.equal(response.status,200);assert.equal(sends.length,1);assert.ok(sends[0].text.includes('AKCC01001'));assert.ok(sends[0].text.includes('AKCC01002'));assert.ok(!JSON.stringify(body).includes('AKCC01001'));await route.POST(req());assert.equal(sends.length,1);
});
test('membership ID lookup sends only to the stored address and keeps details private',async()=>{
 const db=new FakeDB();const member={id:randomUUID(),email:'registered@example.invalid',membership_id:'AKCC01003',last_name:'Player',payment_status:'paid',membership_status:'active'};db.tables.club_memberships=[member];let sends=[];
 const route=load('app/api/membership/recovery/route.ts',{'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/email':{sendEmail:async m=>sends.push(m)}});
 const request=body=>new Request('https://example.invalid',{method:'POST',body:JSON.stringify(body)});
 const result=await route.POST(request({membership_id:'akcc01003'}));assert.equal(result.status,200);assert.equal(sends.length,1);assert.equal(sends[0].to,member.email);assert.ok(!JSON.stringify(await result.json()).includes(member.email));
 assert.equal((await route.POST(request({surname:'Player'}))).status,400);
 const mismatch=await route.POST(request({membership_id:member.membership_id,email:'other@example.invalid'}));assert.equal(mismatch.status,200);assert.equal(sends.length,1);
});
test('immediate search populates family memberships without email or private details and includes expired members',async()=>{
 const a=load('lib/membershipAccess.ts');const db=new FakeDB();const member={id:randomUUID(),email:'family@example.invalid',first_name:'First',last_name:'Player',membership_id:'AKCC01008',payment_status:'paid',membership_status:'expired',membership_end_date:'2025-12-31',membership_options:[{key:'school_pupil'}],phone:'private-phone',date_of_birth:'2010-01-01',street_address:'private-address'};
 db.tables.club_memberships=[member,{...member,id:randomUUID(),membership_id:'AKCC01009',membership_status:'active'},{...member,id:randomUUID(),membership_id:'AKCC01010',membership_status:'cancelled'}];
 const route=load('app/api/membership/search/route.ts',{'@/lib/supabase/service':{createSupabaseServiceClient:()=>db}});
 const request=body=>new Request('https://example.invalid',{method:'POST',body:JSON.stringify(body)});
 const response=await route.POST(request({email:member.email,surname:'Player'}));const result=await response.json();assert.equal(response.status,200);assert.equal(result.members.length,3);assert.equal(result.members[0].membership_id,member.membership_id);assert.equal(result.members[0].option_key,'school_pupil');assert.equal(db.tables.email_delivery_logs.length,0);
 for(const field of ['email','phone','date_of_birth','street_address','id'])assert.equal(Object.hasOwn(result.members[0],field),false);
 const token=result.members[0].checkout_token;assert.equal(a.readMemberCheckoutToken(token).id,member.id);assert.equal(a.readMemberAccessToken(token),null);assert.ok(!Buffer.from(token.split('.')[0],'base64url').toString().includes(member.email));
 const byId=await route.POST(request({membership_id:'akcc01009'}));assert.equal((await byId.json()).members.length,1);
 const mismatch=await route.POST(request({membership_id:'AKCC01009',email:'wrong@example.invalid'}));assert.equal((await mismatch.json()).members.length,0);
 assert.equal((await route.POST(request({surname:'Player'}))).status,400);
});
test('checkout-only tokens expire, reject tampering and cannot grant private profile access',()=>{
 const a=load('lib/membershipAccess.ts');const token=a.memberCheckoutToken({id:randomUUID()},1000);
 assert.ok(a.readMemberCheckoutToken(token,1001));assert.equal(a.readMemberCheckoutToken(token,1801000),null);assert.equal(a.readMemberCheckoutToken(token+'x',1001),null);assert.equal(a.readMemberAccessToken(token,1001),null);
});
test('failed recovery request reports failure instead of asking member to check inbox',async()=>{
 const db=new FakeDB();const a=load('lib/membershipAccess.ts');const email='failed@example.invalid';db.tables.email_delivery_logs=[{id:a.recoveryClaim(email),status:'failed'}];
 const route=load('app/api/membership/recovery/route.ts',{'@/lib/supabase/service':{createSupabaseServiceClient:()=>db}});
 const result=await route.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({email})}));assert.equal(result.status,503);assert.match((await result.json()).error,/previous lookup email failed/);
});
test('checkout-only access reaches renewal validation for its member without email verification and rejects cancellation',async()=>{
 const a=load('lib/membershipAccess.ts');const db=new FakeDB();const member={id:randomUUID(),email:'private@example.invalid',membership_id:'AKCC01011',payment_status:'paid',membership_status:'expired'};db.tables.club_memberships=[member];
 const route=load('app/api/membership/renew/route.ts',{'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/stripe':{getStripe(){throw Error('must not create payment for invalid option');}}});
 const req=()=>new Request('https://example.invalid',{method:'POST',body:JSON.stringify({member_token:a.memberCheckoutToken(member),option_key:'unavailable',terms_accepted:true})});
 assert.equal((await route.POST(req())).status,400);db.tables.club_memberships[0].membership_status='cancelled';assert.equal((await route.POST(req())).status,403);
});

test('member search includes all statuses and records without IDs but grants renewal only to eligible paid members',async()=>{
 const db=new FakeDB();const statuses=['pending_payment','failed','expired','refunded','paid'];db.tables.club_memberships=statuses.map((status,i)=>({id:randomUUID(),email:'all@example.invalid',first_name:'Player',last_name:'Family',payment_status:status,membership_status:status==='paid'?'cancelled':'pending_payment',membership_id:i===0?null:'AKCC'+i}));
 const route=load('app/api/membership/search/route.ts',{'@/lib/supabase/service':{createSupabaseServiceClient:()=>db}});
 const response=await route.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({email:'all@example.invalid'})}));const body=await response.json();assert.equal(body.members.length,5);assert.equal(body.members[0].membership_id,'Not assigned yet');assert.ok(body.members.every(m=>!m.checkout_token));assert.deepEqual(body.members.map(m=>m.payment_status),statuses);
});
