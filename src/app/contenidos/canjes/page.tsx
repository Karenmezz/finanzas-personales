import { BarterWorkspace } from "@/components/barter-workspace";

export default async function BarterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const period = typeof query.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month) ? query.month : undefined;
  return <BarterWorkspace initialCreating={query.new === "barter"} key={`${query.request ?? ""}-${query.new ?? ""}-${period ?? "default"}-${typeof query.edit === "string" ? query.edit : ""}`} initialPeriod={period} initialEditId={typeof query.edit === "string" ? query.edit : undefined} />;
}
