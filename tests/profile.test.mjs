import test from 'node:test';import assert from 'node:assert/strict';
import {validProfile,greetingDate,nextColombiaMidnight} from '../src/lib/profile.ts';
test('profile accepts a private name and optional photo without embedded personal defaults',()=>{assert.equal(validProfile({displayName:'Nombre de ejemplo',photo:null}),true);for(const value of [null,{displayName:'',photo:null},{displayName:'   ',photo:null},{displayName:'x'.repeat(61),photo:null},{displayName:1,photo:null},{displayName:'Nombre',photo:'https://example.com/photo.jpg'},{displayName:'Nombre',photo:'data:image/svg+xml;base64,PHN2Zz4='}])assert.equal(validProfile(value),false);});
test('photo requires JPEG markers, bounded base64, and no arbitrary image URL',()=>{const jpeg='data:image/jpeg;base64,'+btoa(String.fromCharCode(255,216,255,0,255,217));assert.equal(validProfile({displayName:'Nombre',photo:jpeg}),true);assert.equal(validProfile({displayName:'Nombre',photo:'data:image/jpeg;base64,aGVsbG8='}),false);assert.equal(validProfile({displayName:'Nombre',photo:'data:image/jpeg;base64,'+'A'.repeat(180000)}),false);});
test('greeting follows today in Colombia rather than UTC and formats Spanish date',()=>{assert.equal(greetingDate(new Date('2026-11-14T04:59:59Z')),'Viernes 13 de noviembre');assert.equal(greetingDate(new Date('2026-11-14T05:00:00Z')),'Sábado 14 de noviembre');});
test('next midnight handles Colombia, year changes, and leap days',()=>{for(const [date,next] of [['2026-11-14T04:59:59Z','2026-11-14T05:00:00.000Z'],['2026-12-31T23:00:00Z','2027-01-01T05:00:00.000Z'],['2024-02-28T23:00:00Z','2024-02-29T05:00:00.000Z']])assert.equal(nextColombiaMidnight(new Date(date)).toISOString(),next);});

test('profile migration can run after initialization without losing profiles or financial records',async()=>{
 const {createClient}=await import('@libsql/client');const {mkdtemp,readFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const folder=await mkdtemp(join(tmpdir(),'profile-migration-'));const client=createClient({url:'file:'+join(folder,'test.db')});
 try {
  const original=await readFile(new URL('../drizzle/0000_sleepy_scrambler.sql',import.meta.url),'utf8');
  for(const statement of original.split('--> statement-breakpoint'))if(statement.trim())await client.execute(statement);
  await client.execute("INSERT INTO bills(id,name,category,amount,due_date,paid) VALUES ('bill','Servicio de prueba','Servicios',70000,'2026-11-13',1)");
  const migration=await readFile(new URL('../drizzle/0004_rich_lila_cheney.sql',import.meta.url),'utf8');
  await client.execute(migration);
  await client.execute({sql:'INSERT INTO user_profile(id,value) VALUES (?,?)',args:['admin',JSON.stringify({displayName:'Nombre de prueba',photo:null})]});
  await client.execute(migration);
  assert.equal(JSON.parse((await client.execute("SELECT value FROM user_profile WHERE id='admin'")).rows[0].value).displayName,'Nombre de prueba');
  const bill=(await client.execute("SELECT amount,paid FROM bills WHERE id='bill'")).rows[0];assert.equal(bill.amount,70000);assert.equal(bill.paid,1);
 } finally {client.close();await rm(folder,{recursive:true,force:true});}
});
