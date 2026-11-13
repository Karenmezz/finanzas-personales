import type { Campaign } from "./finance";

export function scheduledContents(campaigns: Campaign[], period: string) {
  return campaigns.filter((campaign) => campaign.incomeType !== "personal" && campaign.contentDueDate?.startsWith(`${period}-`))
    .sort((a,b) => a.contentDueDate!.localeCompare(b.contentDueDate!) || a.name.localeCompare(b.name,"es"));
}
export function shiftCalendarMonth(period: string, offset: number) {
  const [year,month] = period.split("-").map(Number);
  return new Date(Date.UTC(year,month-1+offset,1)).toISOString().slice(0,7);
}
export function calendarCells(period: string): (number | null)[] {
  const [year,month] = period.split("-").map(Number);
  const cells: (number | null)[] = [...Array.from({length:(new Date(Date.UTC(year,month-1,1)).getUTCDay()+6)%7},()=>null),...Array.from({length:new Date(Date.UTC(year,month,0)).getUTCDate()},(_,index)=>index+1)];
  while(cells.length%7) cells.push(null);
  return cells;
}
