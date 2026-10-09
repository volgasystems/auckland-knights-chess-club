import { POST as crud } from "@/app/api/admin/crud/route";
export async function POST(req: Request) {
  const body = await req.json();
  return crud(new Request(req.url, {method:"POST", headers:req.headers, body:JSON.stringify({...body,table:"tournaments"})}));
}
