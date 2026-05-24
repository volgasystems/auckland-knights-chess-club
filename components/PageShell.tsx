import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
export default function PageShell({ children }: { children: React.ReactNode }) {
  return <><PublicHeader />{children}<Footer /></>;
}
