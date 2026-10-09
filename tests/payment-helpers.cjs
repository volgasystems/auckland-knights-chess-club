const fs=require('node:fs'); const vm=require('node:vm'); const ts=require('typescript'); const {randomUUID}=require('node:crypto');
function load(path, deps = {}) {
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  const quietConsole = { ...console, error() {} };
  vm.runInNewContext(output, { exports, require: n => n in deps ? deps[n] : n.startsWith("@/") ? load(n.slice(2)+".ts", deps) : require(n), process, console: quietConsole, Date, URL, Buffer }, { filename: path });
  return exports;
}
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
      ilike(k, v) { const literal = v.replace(/\\([\\%_])/g,'$1').toLowerCase(); filters.push(r => String(r[k] || '').toLowerCase() === literal); return q; },
      is(k, v) { filters.push(r => r[k] === v); return q; },
      gte(k, v) { filters.push(r => r[k] >= v); return q; },
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

module.exports={load,FakeDB};
