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

test('account API saves canonical and legacy NOT NULL name/number fields on create and update', async () => {
 const {load}=require('./payment-helpers.cjs');
 for(const legacy of [[],['account_name'],['account_name','bank_account_name','bank_account_number']]) {
  const db=new PGlite();
  try {
   await db.exec(`create table payment_accounts(id uuid primary key default gen_random_uuid(),name text not null,code text not null,account_number text not null,purpose text not null,is_active boolean,updated_at timestamptz${legacy.map(c=>`,${c} text not null`).join('')});`);
   let insertedId;
   const service={from(){
    let op='select',values,id,column;
    const q={select(c){column=c;return q;},limit(){return q;},single(){return q;},eq(k,v){id=v;return q;},insert(v){op='insert';values=v;return q;},update(v){op='update';values=v;return q;},async then(resolve,reject){
     try {
      if(op==='select') {try{await db.query(`select ${column} from payment_accounts limit 1`);return resolve({data:[],error:null});}catch{return resolve({data:null,error:{code:'42703'}});}}
      const keys=Object.keys(values),params=Object.values(values);
      const sql=op==='insert'?`insert into payment_accounts(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`:`update payment_accounts set ${keys.map((k,i)=>k+'=$'+(i+1)).join(',')} where id=$${keys.length+1} returning *`;
      if(op==='update')params.push(id);
      const row=(await db.query(sql,params)).rows[0];insertedId=row.id;resolve({data:row,error:null});
     }catch(e){resolve({data:null,error:{message:e.message,code:e.code}});}
    }};return q;
   }};
   const api=load('app/api/admin/crud/route.ts',{'@/lib/auth':{getCurrentAdmin:async()=>({profile:{role:'super_admin'},user:{id:'fixture'}})},'@/lib/roles':{canAccessTable:()=>true},'@/lib/supabase/service':{createSupabaseServiceClient:()=>service},'next/cache':{revalidatePath(){}}});
   for(const action of ['create','update']) {
    const name=action==='create'?'Fixture Club':'Updated Fixture Club';
    const response=await api.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({table:'payment_accounts',action,id:insertedId,payload:{name,code:'fixture',account_number:'01-1234-1234567-00',purpose:'Testing',is_active:true,bank_account_name:'UNTRUSTED',bank_account_number:'UNTRUSTED'}})}));
    const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));
    const row=(await db.query('select * from payment_accounts')).rows[0];assert.equal(row.name,name);
    for(const c of legacy)assert.equal(row[c],c==='bank_account_number'?'01-1234-1234567-00':name);
   }
  }finally{await db.close();}
 }
});
