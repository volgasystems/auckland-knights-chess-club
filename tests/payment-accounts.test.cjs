const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
test('bank accounts support multiple event choices and prevent deleting an assigned account', async () => {
  const db = new PGlite();
  try {
    await db.exec('create table tournaments (id uuid primary key default gen_random_uuid());');
    const migration = fs.readFileSync('supabase/migrations/20261009_payment_accounts.sql', 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    const { rows } = await db.query("insert into payment_accounts(name,code,account_number,purpose) values ('Club','club','01-0000-0000000-00','Membership'),('Events','event','02-0000-0000000-00','Tournament') returning id");
    assert.equal(rows.length, 2);
    await db.query('insert into tournaments(payment_account_id) values ($1)', [rows[1].id]);
    await assert.rejects(db.query('delete from payment_accounts where id=$1', [rows[1].id]), /foreign key/);
    await db.query('update payment_accounts set is_active=false where id=$1', [rows[1].id]);
    await db.query('delete from payment_accounts where id=$1', [rows[0].id]);
    await assert.rejects(db.query("insert into payment_accounts(name,code,account_number,purpose) values ('','x','x','x')"), /check constraint/);
  } finally { await db.close(); }
});
