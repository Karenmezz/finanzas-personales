import { MonthlyWorkspace } from "@/components/monthly-workspace";

export default async function FinancesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <MonthlyWorkspace key={`${query.new ?? "default"}-${query.request ?? ""}`} area="finances" initialCreate={query.new === "expense" ? "expense" : undefined} />;
}
