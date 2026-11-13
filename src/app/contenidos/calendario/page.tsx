import { ContentCalendarWorkspace } from "@/components/content-calendar-workspace";
export default async function CalendarPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams;
  const period=typeof query.month==="string"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)&&query.month>="1900-01"&&query.month<="9998-12"?query.month:undefined;
  return <ContentCalendarWorkspace key={period??"current"} initialPeriod={period} />;
}
