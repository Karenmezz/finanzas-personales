import { SettingsWorkspace } from "@/components/settings-workspace";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <SettingsWorkspace initialProfile={query.section === "profile"} key={`${query.section ?? ""}-${query.new ?? "default"}-${query.request ?? ""}`} initialIncome={query.new === "income"} />;
}
