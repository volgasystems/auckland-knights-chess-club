const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {randomUUID}=require('node:crypto');const {load,FakeDB}=require('./payment-helpers.cjs');
const bank=load('lib/bankTransfer.ts');
const account={id:randomUUID(),name:'Fixture Club',account_number:'01-1234-1234567-00',is_active:true};
test('bank selection respects explicit tournament account, separate defaults, inactive accounts and ambiguous configurations',async()=>{
 const db=new FakeDB();db.tables.payment_accounts=[structuredClone(account)];
 assert.equal((await bank.bankTransferAccount(db,'membership')).id,account.id);
 const other={...account,id:randomUUID(),name:'Event',use_for_tournaments:true};db.tables.payment_accounts.push(other);
 assert.equal(await bank.bankTransferAccount(db,'membership'),null);
 assert.equal((await bank.bankTransferAccount(db,'tournament')).id,other.id);
 assert.equal((await bank.bankTransferAccount(db,'tournament',{payment_account_id:account.id})).id,account.id);
 db.tables.payment_accounts[0].is_active=false;
 assert.equal(await bank.bankTransferAccount(db,'tournament',{payment_account_id:account.id}),null);
 db.fail={table:'club_memberships',op:'select'};assert.equal(await bank.bankTransferAccount(db,'membership'),null);
 assert.throws(()=>bank.registrationPaymentMethod('cash'));assert.equal(bank.registrationPaymentMethod(undefined),'stripe');
});
function registerFixture(kind){
 const tournament={id:randomUUID(),title:'Fixture',status:'open',allow_public_registration:true,tournament_type:'general_open',entry_fee_cents:2000,max_players:80};
 const db=new FakeDB(null,tournament);db.tables.payment_accounts=[structuredClone(account)];db.tables.membership_options=[{key:'annual',name:'Annual',fee_cents:6000,is_active:true}];
 let stripeCalls=0,emails=[];
 const api=load(kind==='membership'?'app/api/membership/checkout/route.ts':'app/api/tournaments/[id]/register/route.ts',{'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/stripe':{getStripe(){stripeCalls++;throw Error('Stripe must not be used');}},'@/lib/paymentConfig':{assertPaymentReady(){stripeCalls++;throw Error('Stripe not configured');}},'@/lib/registrationNotification':{notifyRegistrationReceived:async(...args)=>{emails.push(args[1]);return 'sent';}}});
 const body={first_name:'Bank',last_name:'Fixture',email:'fixture@example.invalid',phone:'test',date_of_birth:'2000-01-01',gender:'Female',terms_accepted:true,consent:true,payment_method:'bank_transfer',items:[{key:'annual',quantity:1}]};
 const post=(patch={})=>api.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({...body,...patch})}),{params:Promise.resolve({id:tournament.id})});
 return {db,post,stripeCalls:()=>stripeCalls,emails};
}
for(const kind of ['membership','tournament'])test(`${kind} bank registration stays tentative, uses server fee/account and safely reuses an identical submission`,async()=>{
 const a=registerFixture(kind),res=await a.post({amount_cents:1,bank_account_snapshot:{account_number:'attacker'}});const json=await res.json();assert.equal(res.status,200,JSON.stringify(json));
 assert.equal(json.payment_status,'pending_payment');assert.equal(json.bank_transfer.account_number,account.account_number);assert.equal(json.bank_transfer.amount_cents,kind==='membership'?6000:2000);assert.match(json.bank_transfer.reference,/^[MT][A-F0-9]{11}$/);assert.equal(a.stripeCalls(),0);assert.equal(a.db.tables.payment_records.length,0);assert.equal(a.emails.length,1);
 const rows=a.db.tables[kind==='membership'?'club_memberships':'tournament_registrations'];assert.equal(rows.length,1);if(kind==='tournament')assert.equal(rows[0].registration_status,'pending_payment');
 const repeated=await (await a.post()).json();assert.equal(repeated.bank_transfer.reference,json.bank_transfer.reference);assert.equal(rows.length,1);assert.equal(a.emails.length,1);
 rows[0].payment_status='paid';assert.equal((await a.post()).status,409);assert.equal(rows.length,1);
});
test('bank instructions are included in acknowledgement, escaped in HTML, and never treated as Stripe reminders',async()=>{
 const db=new FakeDB();let mail;
 const notify=load('lib/registrationNotification.ts',{'@/lib/email':{sendEmail:async x=>{mail=x;}}});
 const r={id:randomUUID(),email:'fixture@example.invalid',first_name:'<Bank>',last_name:'Fixture',entry_fee_cents:2000,payment_method:'bank_transfer',payment_reference:'T01234567890',bank_account_snapshot:account};
 assert.equal(await notify.notifyRegistrationReceived(db,r,'tournament','Fixture'),'sent');assert.match(mail.text,/01-1234-1234567-00/);assert.match(mail.text,/T01234567890/);assert.match(mail.text,/Tentative/);assert.ok(!mail.html.includes('<Bank>'));
 const reminder=load('lib/tournamentPaymentReminder.ts',{'@/lib/stripe':{},'@/lib/email':{},'@/lib/tournamentPayment':{},'@/lib/tournamentRefund':{}});assert.equal(reminder.reminderStage({...r,created_at:'2026-10-01',payment_status:'pending_payment',registration_status:'pending_payment'},{status:'open',allow_public_registration:true,payment_reminders_enabled:true,start_date:'2099-01-01'}),null);
});
test('membership approval API requires authorised admin and verified bank receipt',async()=>{
 for(const role of [null,'news_editor','admin']){
  const db=new FakeDB();let approvals=0;const id=randomUUID();db.tables.club_memberships=[{id,payment_method:'bank_transfer',payment_status:'pending_payment',membership_status:'pending_payment'}];db.rpc=async()=>{approvals++;return {data:{id,payment_status:'paid'}};};
  const api=load('app/api/admin/payments/membership-bank-confirm/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>role?{profile:{role},user:{id:randomUUID()}}:null},'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/membershipPayment':{activateMembership:async()=>({status:'confirmed'})},'next/cache':{revalidatePath(){}}});
  const post=(patch={})=>api.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({registration_id:id,method:'bank_transfer',note:'Bank receipt 001',received:true,...patch})}));
  assert.equal((await post()).status,role==='admin'?200:role?403:401);assert.equal(approvals,role==='admin'?1:0);
  if(role==='admin'){assert.equal((await post({received:false})).status,400);db.tables.club_memberships[0].stripe_checkout_session_id='cs_other';assert.equal((await post()).status,409);assert.equal(approvals,1);}
 }
});
test('bank migration fixes legacy account names and atomically audits approvals, duplicate submits and full-event guards',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();const admin=randomUUID(),event=randomUUID(),member=randomUUID(),entry=randomUUID();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id uuid primary key,role text,is_active boolean);
 create table payment_accounts(id uuid primary key default gen_random_uuid(),name text,account_name text not null,account_number text,is_active boolean default true);
 create table tournaments(id uuid primary key,max_players integer);
 create table club_memberships(id uuid primary key,email text,first_name text,last_name text,date_of_birth date,total_amount_cents integer,payment_status text,membership_status text,stripe_checkout_session_id text,updated_at timestamptz);
 create table tournament_registrations(id uuid primary key,tournament_id uuid,email text,first_name text,last_name text,date_of_birth date,entry_fee_cents integer,payment_status text,registration_status text,updated_at timestamptz);
 create table payment_records(id uuid primary key,payment_type text,reference_id uuid,email text,amount_cents integer,status text);`);
 const sql=fs.readFileSync('supabase/migrations/20261025_bank_transfer_registration.sql','utf8');await db.exec(sql);await db.exec(sql);
 const ac=(await db.query("insert into payment_accounts(name,account_number)values('Club','01-1234-1234567-00') returning *")).rows[0];assert.equal(ac.account_name,'Club');
 await db.query("update payment_accounts set account_name='Legacy update' where id=$1",[ac.id]);assert.equal((await db.query('select name from payment_accounts')).rows[0].name,'Legacy update');
 await db.query("insert into profiles values($1,'admin',true)",[admin]);await db.query('insert into tournaments values($1,1)',[event]);
 await db.query("insert into club_memberships(id,email,first_name,last_name,date_of_birth,total_amount_cents,payment_status,membership_status,payment_method,updated_at)values($1,'fixture@example.invalid','Test','Player','2000-01-01',6000,'pending_payment','pending_payment','bank_transfer','2026-10-25')",[member]);
 const approve=()=>db.query("select confirm_bank_membership_payment($1,$2,'Bank reference 001','2026-10-25') as member",[member,admin]);
 for(const result of await Promise.all([approve(),approve()]))assert.equal(result.rows[0].member.payment_status,'paid');assert.equal((await db.query('select count(*)::int n from payment_records')).rows[0].n,1);
 await db.query("insert into tournament_registrations(id,tournament_id,email,first_name,last_name,date_of_birth,entry_fee_cents,payment_status,registration_status,payment_method,updated_at)values($1,$2,'a@example.invalid','A','Player','2000-01-01',2000,'pending_payment','pending_payment','bank_transfer','2026-10-25')",[entry,event]);
 await assert.rejects(db.query("insert into tournament_registrations(id,tournament_id,email,first_name,last_name,date_of_birth,payment_status,payment_method)values($1,$2,'a@example.invalid','A','Player','2000-01-01','pending_payment','bank_transfer')",[randomUUID(),event]),/unique/);
 await db.query("select confirm_manual_tournament_payment($1,$2,'bank_transfer','Bank reference 002','2026-10-25')",[entry,admin]);
 const second=randomUUID();await db.query("insert into tournament_registrations(id,tournament_id,email,first_name,last_name,date_of_birth,entry_fee_cents,payment_status,registration_status,updated_at)values($1,$2,'b@example.invalid','B','Player','2000-01-01',2000,'pending_payment','pending_payment','2026-10-25')",[second,event]);
 await assert.rejects(db.query("select confirm_manual_tournament_payment($1,$2,'bank_transfer','Bank reference 003','2026-10-25')",[second,admin]),/full/);
 await db.query("update club_memberships set payment_status='refunded' where id=$1",[member]);await assert.rejects(approve());
 assert.equal((await db.query('select count(*)::int n from payment_records')).rows[0].n,2);
 }finally{await db.close();}
});
test('payment account saves populate legacy account_name without accepting injected bank fields',async()=>{
 const db=new FakeDB();db.tables.payment_accounts=[];
 const api=load('app/api/admin/crud/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>({profile:{role:'super_admin'},user:{id:randomUUID()}})},'@/lib/roles':{canAccessTable:()=>true},'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'next/cache':{revalidatePath(){}}});
 const res=await api.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({table:'payment_accounts',action:'create',payload:{name:'Fixture Club',account_name:'INJECTED',account_number:'01-1234-1234567-00',code:'main',purpose:'All purpose',is_active:true}})}));
 assert.equal(res.status,200);assert.equal(db.tables.payment_accounts[0].account_name,'Fixture Club');assert.equal(db.tables.payment_accounts[0].name,'Fixture Club');
});
