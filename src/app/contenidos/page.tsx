import { ContentNavigation } from "@/components/content-navigation";
import { MonthlyWorkspace } from "@/components/monthly-workspace";

export default async function ContentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const period = typeof query.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month) ? query.month : undefined;
  return <><div className="mx-auto max-w-7xl"><ContentNavigation /></div><MonthlyWorkspace key={`${period ?? "default"}-${typeof query.edit === "string" ? query.edit : ""}`} area="content" initialPeriod={period} initialEditId={typeof query.edit === "string" ? query.edit : undefined} /></>;
}
