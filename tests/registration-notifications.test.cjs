const test=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');const {load,FakeDB}=require('./payment-helpers.cjs');
test('membership and tournament acknowledgements go to registrant and clearly remain pending',async()=>{
 for(const kind of ['membership','tournament']){
  const db=new FakeDB();const record={id:randomUUID(),email:'registrant@example.invalid',first_name:'<Player>',last_name:'Family',payment_status:'pending_payment'};let sends=[];
  const helper=load('lib/registrationNotification.ts',{'@/lib/email':{sendEmail:async m=>sends.push(m)}});
  assert.equal(await helper.notifyRegistrationReceived(db,record,kind,'Club tournament'),'sent');assert.equal(sends.length,1);assert.equal(sends[0].to,record.email);assert.match(sends[0].text,/Status: Pending payment/);assert.match(sends[0].text,/not confirmed until payment/);assert.ok(sends[0].html.includes('&lt;Player&gt;'));assert.equal(record.payment_status,'pending_payment');assert.equal(db.tables.email_delivery_logs[0].status,'sent');assert.notEqual(db.tables.email_delivery_logs[0].id,record.id);
  await helper.notifyRegistrationReceived(db,record,kind,'Club tournament');assert.equal(sends.length,1);
 }
});
test('failed acknowledgement is logged without changing registration or payment',async()=>{
 const db=new FakeDB();const record={id:randomUUID(),email:'registrant@example.invalid',first_name:'Player',last_name:'Family',payment_status:'pending_payment'};
 const helper=load('lib/registrationNotification.ts',{'@/lib/email':{sendEmail:async()=>{throw Error('Provider rejected domain');}}});
 assert.equal(await helper.notifyRegistrationReceived(db,record,'membership'),'failed');assert.equal(db.tables.email_delivery_logs[0].status,'failed');assert.equal(record.payment_status,'pending_payment');
});
