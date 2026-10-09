const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
function load(path, deps = {}) {
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  const quietConsole = { ...console, error() {} };
  vm.runInNewContext(output, { exports, require: n => n in deps ? deps[n] : require(n), process, console: quietConsole, Date, URL }, { filename: path });
  return exports;
}
const config = load('lib/paymentConfig.ts');
process.env.STRIPE_SECRET_KEY = 'sk_live_test_fixture_not_a_real_key';
process.env.VERCEL_ENV = 'production';
process.env.NEXT_PUBLIC_SITE_URL = 'https://www.aucklandknights.co.nz';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fixture';

class FakeDB {
  constructor(entry, tournament) {
    this.tables = { tournament_registrations: entry ? [structuredClone(entry)] : [], tournaments: tournament ? [structuredClone(tournament)] : [], email_delivery_logs: [], payment_records: [], club_memberships: [] };
    this.fail = null;
  }
  from(table) {
    const db = this;
    let op = 'select', value, opts = {}, filters = [], singular = false, required = false, limit = Infinity;
    const q = {
      select(_cols, o) { if (o) opts = o; return q; },
      insert(v) { op = 'insert'; value = v; return q; },
      upsert(v, o) { op = 'upsert'; value = v; opts = o; return q; },
      update(v) { op = 'update'; value = v; return q; },
      eq(k, v) { filters.push(r => r[k] === v); return q; },
      neq(k, v) { filters.push(r => r[k] !== v); return q; },
      in(k, v) { filters.push(r => v.includes(r[k])); return q; },
      order() { return q; }, limit(n) { limit = n; return q; },
      single() { singular = true; required = true; return q; },
      maybeSingle() { singular = true; return q; },
      then(resolve, reject) {
        try {
          if (db.fail && db.fail.table === table && db.fail.op === op) return Promise.resolve({ data: null, error: { message: 'Simulated database failure' } }).then(resolve, reject);
          const rows = db.tables[table] ||= [];
          let selected;
          if (op === 'insert' || op === 'upsert') {
            const row = { id: randomUUID(), ...structuredClone(value) };
            const duplicate = rows.find(r => r.id === row.id);
            if (duplicate && op === 'insert') return Promise.resolve({ data: null, error: { code: '23505', message: 'Duplicate primary key' } }).then(resolve, reject);
            if (!duplicate) rows.push(row);
            selected = [duplicate || row];
          } else {
            selected = rows.filter(r => filters.every(f => f(r))).slice(0, limit);
            if (op === 'update') selected.forEach(r => Object.assign(r, structuredClone(value)));
          }
          return Promise.resolve({ data: opts.head ? null : singular ? structuredClone(selected[0] || null) : structuredClone(selected), count: selected.length, error: required && !selected.length ? { message: 'Row not found' } : null }).then(resolve, reject);
        } catch (e) { return Promise.reject(e).then(resolve, reject); }
      }
    };
    return q;
  }
}
function fixture() {
  const id = randomUUID(), tid = randomUUID();
  const entry = { id, tournament_id: tid, first_name: 'Test', last_name: 'Player', email: 'test@example.invalid', phone: 'test', entry_fee_cents: 2000, category_name: 'Open', payment_status: 'pending_payment', registration_status: 'pending_payment', stripe_checkout_session_id: 'cs_live_fixture' };
  const tournament = { id: tid, title: 'Fixture tournament', status: 'open', allow_public_registration: true, entry_fee_cents: 2000, category_options: [], max_players: 80 };
  const session = { id: 'cs_live_fixture', mode: 'payment', status: 'complete', payment_status: 'paid', livemode: true, currency: 'nzd', amount_total: 2000, payment_intent: 'pi_fixture', metadata: { type: 'tournament_registration', registration_id: id, tournament_id: tid } };
  let sends = [], failEmail = false;
  const payment = load('lib/tournamentPayment.ts', { '@/lib/email': { sendEmail: async input => { if (failEmail) throw Error('Email unavailable'); sends.push(input); } }, '@/lib/paymentConfig': config });
  return { entry, tournament, session, db: new FakeDB(entry, tournament), payment, sends, setFailEmail(v) { failEmail = v; } };
}
test('production checkout rejects test keys, missing webhook and unsafe return URLs', () => {
  const env = { STRIPE_SECRET_KEY: 'sk_live_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture', VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://www.aucklandknights.co.nz' };
  assert.equal(config.paymentConfiguration(env).available, true);
  for (const change of [{ STRIPE_SECRET_KEY: 'sk_test_fixture' }, { STRIPE_WEBHOOK_SECRET: '' }, { NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' }, { STRIPE_SECRET_KEY: '' }]) assert.equal(config.paymentConfiguration({ ...env, ...change }).available, false);
});
test('unpaid, incomplete, wrong amount, wrong currency, wrong mode and unrelated sessions cannot confirm', () => {
  const f = fixture();
  for (const change of [{ payment_status: 'unpaid' }, { status: 'open' }, { amount_total: 1 }, { currency: 'usd' }, { livemode: false }, { id: 'cs_live_unrelated' }, { metadata: { ...f.session.metadata, tournament_id: randomUUID() } }]) assert.throws(() => f.payment.validateTournamentPayment({ ...f.session, ...change }, f.entry));
});
test('refunded or cancelled entries cannot be resurrected by replay', () => {
  const f = fixture();
  assert.throws(() => f.payment.validateTournamentPayment(f.session, { ...f.entry, payment_status: 'refunded' }));
  assert.throws(() => f.payment.validateTournamentPayment(f.session, { ...f.entry, registration_status: 'cancelled' }));
});
test('paid entry is confirmed and receipt saved; replay sends once and saves one receipt', async () => {
  const f = fixture();
  const result = await f.payment.confirmTournamentPayment(f.db, f.session);
  assert.equal(result.status, 'confirmed'); assert.equal(result.email_status, 'sent');
  assert.equal(f.db.tables.tournament_registrations[0].registration_status, 'confirmed');
  await f.payment.confirmTournamentPayment(f.db, f.session);
  assert.equal(f.db.tables.payment_records.length, 1); assert.equal(f.sends.length, 1);
});
test('historical receipt is reused when its random ID differs from registration ID', async () => {
  const f = fixture(); f.db.tables.payment_records.push({ id: randomUUID(), stripe_checkout_session_id: f.session.id });
  await f.payment.confirmTournamentPayment(f.db, f.session);
  assert.equal(f.db.tables.payment_records.length, 1);
});
test('concurrent webhook and return verification claim only one email', async () => {
  const f = fixture();
  await Promise.all([f.payment.confirmTournamentPayment(f.db, f.session), f.payment.confirmTournamentPayment(f.db, f.session)]);
  assert.equal(f.sends.length, 1); assert.equal(f.db.tables.payment_records.length, 1);
});
test('database confirmation failure is surfaced instead of silently acknowledged', async () => {
  const f = fixture(); f.db.fail = { table: 'tournament_registrations', op: 'update' };
  await assert.rejects(f.payment.confirmTournamentPayment(f.db, f.session));
  assert.equal(f.sends.length, 0); assert.equal(f.db.tables.tournament_registrations[0].payment_status, 'pending_payment');
});
test('email failure keeps paid entry confirmed and retry later sends once', async () => {
  const f = fixture(); f.setFailEmail(true);
  const result = await f.payment.confirmTournamentPayment(f.db, f.session);
  assert.equal(result.status, 'confirmed'); assert.equal(result.email_status, 'failed');
  assert.equal(f.db.tables.email_delivery_logs[0].status, 'failed');
  f.setFailEmail(false);
  assert.equal((await f.payment.confirmTournamentPayment(f.db, f.session)).email_status, 'sent');
  assert.equal(f.sends.length, 1);
});
test('abandoned email claim can be recovered after timeout', async () => {
  const f = fixture(); f.db.tables.email_delivery_logs.push({ id: f.entry.id, status: 'queued', created_at: new Date(Date.now() - 180000).toISOString() });
  assert.equal(await f.payment.sendTournamentConfirmation(f.db, f.entry, f.tournament), 'sent'); assert.equal(f.sends.length, 1);
});
test('confirmation HTML escapes user and tournament content', async () => {
  const f = fixture(); f.entry.first_name = '<img onerror=evil>'; f.tournament.title = '<script>evil</script>';
  await f.payment.sendTournamentConfirmation(f.db, f.entry, f.tournament);
  assert.ok(!f.sends[0].html.includes('<script>')); assert.ok(f.sends[0].html.includes('&lt;script&gt;'));
});
function webhook(f, event) {
  return load('app/api/stripe/webhook/route.ts', { '@/lib/stripe': { getStripe: () => ({ webhooks: { constructEvent: () => event } }) }, '@/lib/supabase/service': { createSupabaseServiceClient: () => f.db }, '@/lib/email': { sendEmail: async () => {} }, '@/lib/tournamentPayment': f.payment, '@/lib/paymentConfig': config });
}
function signedRequest() { return new Request('https://example.invalid/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': 'fixture' }, body: '{}' }); }
test('webhook requests without signature are rejected', async () => {
  const f = fixture(); const route = webhook(f, {});
  assert.equal((await route.POST(new Request('https://example.invalid', { method: 'POST', body: '{}' }))).status, 400);
});
test('webhook returns retry status on DB or email errors', async () => {
  const f = fixture(); const route = webhook(f, { id: 'evt_fixture', type: 'checkout.session.completed', data: { object: f.session } });
  f.db.fail = { table: 'tournament_registrations', op: 'update' };
  assert.equal((await route.POST(signedRequest())).status, 503);
  f.db.fail = null; f.setFailEmail(true);
  assert.equal((await route.POST(signedRequest())).status, 503);
  assert.equal(f.db.tables.tournament_registrations[0].payment_status, 'paid');
  f.setFailEmail(false); assert.equal((await route.POST(signedRequest())).status, 200);
});
test('completed but unpaid delayed-payment event stays pending', async () => {
  const f = fixture(); const route = webhook(f, { type: 'checkout.session.completed', data: { object: { ...f.session, payment_status: 'unpaid' } } });
  assert.equal((await route.POST(signedRequest())).status, 200); assert.equal(f.db.tables.tournament_registrations[0].payment_status, 'pending_payment'); assert.equal(f.sends.length, 0);
});
test('async payment success confirms entry', async () => {
  const f = fixture(); const route = webhook(f, { type: 'checkout.session.async_payment_succeeded', data: { object: f.session } });
  assert.equal((await route.POST(signedRequest())).status, 200); assert.equal(f.db.tables.tournament_registrations[0].payment_status, 'paid');
});
test('late expiry event cannot downgrade a paid entry', async () => {
  const f = fixture(); await f.payment.confirmTournamentPayment(f.db, f.session);
  const route = webhook(f, { type: 'checkout.session.expired', data: { object: f.session } });
  assert.equal((await route.POST(signedRequest())).status, 200); assert.equal(f.db.tables.tournament_registrations[0].payment_status, 'paid');
});
test('async failure marks entry unconfirmed and sends failure notice once', async () => {
  const f = fixture(); const route = webhook(f, { type: 'checkout.session.async_payment_failed', data: { object: f.session } });
  assert.equal((await route.POST(signedRequest())).status, 200); assert.equal(f.db.tables.tournament_registrations[0].payment_status, 'failed');
  await route.POST(signedRequest()); assert.equal(f.sends.length, 1); assert.ok(f.sends[0].text.includes('do not pay again'));
});
test('unpaid return verification never reports confirmation', async () => {
  const f = fixture();
  const route = load('app/api/payments/verify/route.ts', { '@/lib/stripe': { getStripe: () => ({ checkout: { sessions: { retrieve: async () => ({ ...f.session, payment_status: 'unpaid' }) } } }) }, '@/lib/supabase/service': { createSupabaseServiceClient: () => f.db }, '@/lib/tournamentPayment': f.payment, '@/lib/paymentConfig': config });
  const result = await route.POST(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ session_id: f.session.id }) }));
  assert.equal((await result.json()).status, 'pending'); assert.equal(f.sends.length, 0);
});
test('invalid return reference never calls Stripe', async () => {
  const f = fixture();
  const route = load('app/api/payments/verify/route.ts', { '@/lib/stripe': { getStripe: () => { throw Error('Must not be called'); } }, '@/lib/supabase/service': {}, '@/lib/tournamentPayment': f.payment, '@/lib/paymentConfig': config });
  assert.equal((await route.POST(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ session_id: 'invalid' }) }))).status, 400);
});
test('non-admin cannot reconcile a payment', async () => {
  const f = fixture();
  const route = load('app/api/admin/payments/reconcile/route.ts', { '@/lib/auth': { getCurrentAdmin: async () => null }, '@/lib/roles': { canAccess: () => false }, '@/lib/supabase/service': {}, '@/lib/stripe': {}, '@/lib/tournamentPayment': f.payment });
  assert.equal((await route.POST(new Request('https://example.invalid', { method: 'POST', body: '{}' }))).status, 403);
});
function registrationRoute(f, stripe) {
  return load('app/api/tournaments/[id]/register/route.ts', { '@/lib/supabase/service': { createSupabaseServiceClient: () => f.db }, '@/lib/stripe': { getStripe: () => stripe }, '@/lib/paymentConfig': config, '@/lib/tournamentPayment': f.payment });
}
function registrationRequest(f, change = {}) { return new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ first_name: 'Test', last_name: 'Player', email: 'test@example.invalid', phone: 'fixture', consent: 'on', ...change }) }); }
test('valid registration links checkout and embeds session ID in return URL', async () => {
  const f = fixture(); let args;
  const stripe = { checkout: { sessions: { create: async input => { args = input; return { id: 'cs_live_newfixture', url: 'https://checkout.stripe.com/fixture' }; } } } };
  const res = await registrationRoute(f, stripe).POST(registrationRequest(f), { params: Promise.resolve({ id: f.tournament.id }) });
  assert.equal(res.status, 200); assert.ok(args.success_url.includes('{CHECKOUT_SESSION_ID}'));
  const data = await res.json(); assert.equal(data.payment_status, 'pending_payment'); assert.equal(f.db.tables.tournament_registrations.at(-1).stripe_checkout_session_id, 'cs_live_newfixture');
});
test('checkout-link database failure expires checkout and gives helpful failure reference', async () => {
  const f = fixture(); let expired = false;
  f.db.fail = { table: 'tournament_registrations', op: 'update' };
  const stripe = { checkout: { sessions: { create: async () => ({ id: 'cs_live_newfixture', url: 'https://checkout.stripe.com/fixture' }), expire: async () => { expired = true; } } } };
  const res = await registrationRoute(f, stripe).POST(registrationRequest(f), { params: Promise.resolve({ id: f.tournament.id }) });
  const data = await res.json(); assert.equal(res.status, 503); assert.ok(data.registration_id); assert.ok(data.error.includes('Do not pay again')); assert.ok(expired);
});
test('free entry remains confirmed when email delivery fails', async () => {
  const f = fixture(); f.db.tables.tournaments[0].entry_fee_cents = 0; f.setFailEmail(true);
  const res = await registrationRoute(f, {}).POST(registrationRequest(f), { params: Promise.resolve({ id: f.tournament.id }) });
  const data = await res.json(); assert.equal(res.status, 200); assert.equal(data.ok, true); assert.equal(data.email_status, 'failed'); assert.ok(data.message.includes('Your entry is saved'));
});
test('invalid registration fields and consent are rejected before insertion', async () => {
  const f = fixture(); const route = registrationRoute(f, {});
  for (const change of [{ first_name: '' }, { email: 'wrong' }, { consent: '' }]) assert.equal((await route.POST(registrationRequest(f, change), { params: Promise.resolve({ id: f.tournament.id }) })).status, 400);
  assert.equal(f.db.tables.tournament_registrations.length, 1);
});
