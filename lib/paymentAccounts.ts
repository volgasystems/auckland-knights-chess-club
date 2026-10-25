export async function paymentAccountFields(s: any) {
  const {data, error} = await s.from("payment_accounts").select("id,name,code,is_active").order("name");
  if (error) return [];
  return [{name:"payment_account_id", label:"Payment account (optional)", placeholder:"No bank account", choices:(data || []).map((a: any) => ({value:a.id,label:`${a.name} — ${a.code}${a.is_active ? "" : " (inactive)"}`}))}];
}

// Deployments may retain legacy NOT NULL columns alongside canonical fields.
// Probe each alias separately: a missing alias must not hide another required one.
export async function paymentAccountAliases(s: any, account: {name:string;account_number:string}) {
  const aliases: Record<string,string> = {};
  const fields: [string,string][] = [["account_name",account.name],["bank_account_name",account.name],["bank_account_number",account.account_number]];
  const results = await Promise.all(fields.map(async ([column,value]) => {
    const result = await s.from("payment_accounts").select(column).limit(1);
    return {column,value,error:result.error};
  }));
  for (const {column,value,error} of results) {
    if (!error) aliases[column] = value;
    else if (!["42703","PGRST204"].includes(error.code)) throw new Error("Unable to check payment account fields. Refresh and try again.");
  }
  return aliases;
}
