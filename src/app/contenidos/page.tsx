import { ContentNavigation } from "@/components/content-navigation";
import { MonthlyWorkspace } from "@/components/monthly-workspace";

export default function ContentPage() {
  return <><div className="mx-auto max-w-7xl"><ContentNavigation /></div><MonthlyWorkspace area="content" /></>;
}
