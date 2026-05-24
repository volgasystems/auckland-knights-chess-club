import { requireAdmin } from "@/lib/auth";
import TournamentsAdmin from "../tournaments/page";
export default async function ResultsAdmin(){ await requireAdmin("results"); return <TournamentsAdmin /> }
