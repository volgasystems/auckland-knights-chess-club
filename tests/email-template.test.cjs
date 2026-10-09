const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('./payment-helpers.cjs');
const {normaliseEmailText,renderEmailTemplate,emailTextHtml,missingEmailValues} = load('lib/emailTemplate.ts');
test('legacy escaped newlines become real line breaks and placeholders retain event names', () => {
  const text = renderEmailTemplate('Hi {{first_name}},\\n\\nEntry for {{tournament_name}}.\\r\\nRegards', {first_name:'Sahithi',tournament_name:'Rapid Open'});
  assert.equal(text, 'Hi Sahithi,\n\nEntry for Rapid Open.\nRegards');
  assert.equal(normaliseEmailText('One\r\nTwo'), 'One\nTwo');
});
test('email HTML uses explicit breaks and escapes recipient data', () => {
  const html = emailTextHtml('Hi <script>\n\nA & B');
  assert.ok(html.includes('&lt;script&gt;<br /><br />A &amp; B'));
  assert.ok(!html.includes('<script>'));
});
test('missing tournament context is detected before bulk delivery', () => {
  assert.deepEqual(Array.from(missingEmailValues('{{first_name}} {{tournament_name}} {{tournament_name}}', {first_name:'Sahithi'})), ['tournament_name']);
});
const {tournamentEmailRecipients} = load('lib/tournamentEmailRecipients.ts');
test('tournament confirmation recipients require paid, confirmed player identity, not just family email', () => {
  const members = [{id:'m1',first_name:'Sahithi',last_name:'Somaraju',email:'family@example.com'}, {id:'m2',first_name:'Sai',last_name:'Somaraju',email:'family@example.com'}];
  const registration = {id:'r1',first_name:' SAHITHI ',last_name:'Somaraju',email:'FAMILY@example.com',payment_status:'paid',registration_status:'confirmed'};
  assert.equal(tournamentEmailRecipients(members,[registration]).length, 1);
  assert.equal(tournamentEmailRecipients(members,[registration])[0].id, 'm1');
  for (const patch of [{payment_status:'pending_payment'}, {payment_status:'refunded'}, {registration_status:'cancelled'}]) assert.equal(tournamentEmailRecipients(members,[{...registration,...patch}]).length, 0);
});
const {FakeDB} = require('./payment-helpers.cjs');
test('bulk route fills real tournament name, excludes unpaid entries, and blocks missing tournament before send', async () => {
  const db = new FakeDB();
  db.tables.email_templates = [{id:'template',template_key:'general_tournament_paid',name:'Confirmation',subject:'{{tournament_name}} confirmed',body:'Hi {{first_name}},\\n\\nConfirmed for {{tournament_name}}.'}];
  db.tables.club_memberships = [{id:'m1',first_name:'Sahithi',last_name:'Somaraju',email:'family@example.com'}, {id:'m2',first_name:'Sai',last_name:'Somaraju',email:'family@example.com'}];
  db.tables.tournaments = [{id:'event',title:'Rapid Open'}];
  db.tables.tournament_registrations = [{id:'r1',tournament_id:'event',first_name:'Sahithi',last_name:'Somaraju',email:'family@example.com',payment_status:'paid',registration_status:'confirmed'}, {id:'r2',tournament_id:'event',first_name:'Sai',last_name:'Somaraju',email:'family@example.com',payment_status:'pending_payment',registration_status:'pending'}];
  let sent = 0;
  const route = load('app/api/admin/bulk-email/route.ts', {'@/lib/supabase/service':{createSupabaseServiceClient:()=>db},'@/lib/auth':{getCurrentAdmin:async()=>({user:{id:'admin'},profile:{role:'super_admin'}})},'@/lib/email':{getEmailProviderStatus:async()=>({configured:true}),sendEmail:async()=>{sent++;}}});
  const request = body => new Request('https://example.invalid',{method:'POST',body:JSON.stringify({template_id:'template',target_group:'all',...body})});
  const preview = await route.POST(request({action:'preview',tournament_id:'event'}));
  const result = await preview.json();
  assert.equal(result.recipient_count,1);
  assert.equal(result.subject,'Rapid Open confirmed');
  assert.equal(result.sample_body,'Hi Sahithi,\n\nConfirmed for Rapid Open.');
  const rejected = await route.POST(request({action:'send'}));
  assert.equal(rejected.status,400);
  assert.equal(sent,0);
});
