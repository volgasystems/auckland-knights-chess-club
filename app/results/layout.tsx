import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata('Tournament Results', 'View published chess tournament results and result links from Auckland Knights Chess Club.', "/results");
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
