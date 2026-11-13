// Colombian national holidays: fixed dates and Ley 51/1983 Monday observance.
export function colombianHolidays(year: number): Record<string,string[]> {
  const holidays: Record<string,string[]> = {};
  const add=(date:Date,name:string)=>{const key=date.toISOString().slice(0,10);(holidays[key]??=[]).push(name);};
  const fixed=(month:number,day:number,name:string)=>add(new Date(Date.UTC(year,month-1,day)),name);
  const monday=(month:number,day:number,name:string)=>{const date=new Date(Date.UTC(year,month-1,day));date.setUTCDate(date.getUTCDate()+(8-date.getUTCDay())%7);add(date,name);};
  fixed(1,1,"Año Nuevo");fixed(5,1,"Día del Trabajo");fixed(7,20,"Independencia de Colombia");fixed(8,7,"Batalla de Boyacá");fixed(12,8,"Inmaculada Concepción");fixed(12,25,"Navidad");
  monday(1,6,"Día de los Reyes Magos");monday(3,19,"Día de San José");monday(6,29,"San Pedro y San Pablo");monday(8,15,"Asunción de la Virgen");monday(10,12,"Día de la Diversidad Étnica y Cultural");monday(11,1,"Todos los Santos");monday(11,11,"Independencia de Cartagena");
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
  for(const [offset,name] of [[-3,"Jueves Santo"],[-2,"Viernes Santo"],[43,"Ascensión del Señor"],[64,"Corpus Christi"],[71,"Sagrado Corazón de Jesús"]] as const) add(new Date(Date.UTC(year,month-1,day+offset)),name);
  return holidays;
}
