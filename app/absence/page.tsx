import PageShell from "@/components/PageShell";
import AbsenceForm from "@/components/AbsenceForm";
export default async function AbsencePage({ searchParams }: { searchParams: Promise<{ tournament?: string }> }) { const sp = await searchParams; return <PageShell><main className="container-page py-12"><AbsenceForm defaultTournament={sp.tournament || ""}/></main></PageShell> }
