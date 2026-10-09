const test = require('node:test');
const assert = require('node:assert/strict');
const { load, FakeDB } = require('./payment-helpers.cjs');
test('tournament lookup returns unpaid, expired and cancelled member records', async () => {
 for (const status of ['pending_payment','paid','failed','expired','refunded']) {
  const db = new FakeDB();
  db.tables.club_memberships = [{id:'member', membership_id:'AK01001', email:'member@example.invalid', payment_status:status, membership_status:'cancelled', membership_end_date:'2000-01-01'}];
  const route = load('app/api/membership/lookup/route.ts', {'@/lib/supabase/service':{createSupabaseServiceClient:()=>db}});
  const response = await route.POST(new Request('https://example.invalid', {method:'POST',body:JSON.stringify({membership_id:'AK01001'})}));
  assert.equal(response.status,200); assert.equal((await response.json()).member.payment_status,status);
 }
});
test('report keeps reference layout order and correctly shows paid, pending and waived balances', () => {
 const reports = load('lib/reports.ts');
 assert.equal(reports.selectedColumns('members',reports.DEFAULT_COLUMNS.members).map(c=>c.label).join('|'),'Name|Date Registered|Payable|Paid|Balance|Notes|Person ID|Status|Email');
 const expected = {paid:['$80.00','$0.00'],manual_paid:['$80.00','$0.00'],pending_payment:['$0.00','$80.00'],waived:['$0.00','$0.00']};
 for (const [status,[paid,balance]] of Object.entries(expected)) {
  const row = reports.rowsForColumns([{total_amount_cents:8000,payment_status:status}], 'members', reports.DEFAULT_COLUMNS.members)[0];
  assert.equal(row.Paid,paid); assert.equal(row.Balance,balance);
 }
});
