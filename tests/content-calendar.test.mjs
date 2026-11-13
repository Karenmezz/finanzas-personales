import test from 'node:test';import assert from 'node:assert/strict';
import {scheduledContents,shiftCalendarMonth,calendarCells} from '../src/lib/content-calendar.ts';
const campaign=(id,extra={})=>({id,name:id,brand:'Marca',network:'Instagram',value:100,month:'2026-10',dueDate:'2026-11-30',status:'Pendiente',payments:[],...extra});
test('calendar includes paid, barter, mixed and paid-in-full content by delivery date across campaign months',()=>{
 const rows=[campaign('Paid',{contentDueDate:'2026-11-20',payments:[{amount:100}]}),campaign('Canje',{collaborationType:'Canje',value:0,contentDueDate:'2026-11-15'}),campaign('Mixta',{collaborationType:'Paga y canje',contentDueDate:'2026-11-15'}),campaign('Sin fecha'),campaign('Otra fecha',{contentDueDate:'2026-12-01'}),campaign('Salario',{incomeType:'personal',contentDueDate:'2026-11-10'})];
 assert.deepEqual(scheduledContents(rows,'2026-11').map(c=>c.id),['Canje','Mixta','Paid']);assert.equal(scheduledContents(rows,'2026-12').length,1);assert.equal(scheduledContents(rows,'2026-10').length,0);
});
test('payment deadlines alone never create content calendar events',()=>{assert.equal(scheduledContents([campaign('Solo cobro',{dueDate:'2026-11-20'})],'2026-11').length,0);});
test('month navigation handles year boundaries and leap years',()=>{assert.equal(shiftCalendarMonth('2026-12',1),'2027-01');assert.equal(shiftCalendarMonth('2027-01',-1),'2026-12');assert.equal(shiftCalendarMonth('2024-03',-1),'2024-02');});
test('calendar starts Monday, includes all days, and pads complete weeks',()=>{const november=calendarCells('2026-11');assert.deepEqual(november.slice(0,7),[null,null,null,null,null,null,1]);assert.equal(november.filter(Boolean).length,30);assert.equal(november.length%7,0);const leap=calendarCells('2024-02');assert.equal(leap.filter(Boolean).length,29);assert.equal(calendarCells('2027-02').filter(Boolean).length,28);});

test('kanban contains month deliveries plus optional undated content and excludes personal income',async()=>{
 const {kanbanContents}=await import('../src/lib/content-calendar.ts');
 const rows=[campaign('Dated',{contentDueDate:'2026-11-20'}),campaign('Undated'),campaign('Other month',{contentDueDate:'2026-12-20'}),campaign('Income',{incomeType:'personal'})];
 assert.deepEqual(kanbanContents(rows,'2026-11',null).map(c=>c.id),['Dated','Undated']);assert.deepEqual(kanbanContents(rows,'2026-11',null,false).map(c=>c.id),['Dated']);assert.deepEqual(kanbanContents(rows,'2026-11','2026-11-20').map(c=>c.id),['Dated']);assert.deepEqual(kanbanContents(rows,'2026-11','2026-11-21'),[]);
});
