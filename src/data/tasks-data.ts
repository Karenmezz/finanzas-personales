import "server-only";
import { asc,desc,eq,sql } from "drizzle-orm";
import { db } from "@/db";
import { personalTasks } from "@/db/schema";
import type { TaskInput } from "@/lib/tasks";
let initialization:Promise<unknown>|undefined;
async function ready() {
  if(!initialization)initialization=Promise.resolve(db.run(sql`CREATE TABLE IF NOT EXISTS personal_tasks (
    id text PRIMARY KEY NOT NULL, title text NOT NULL, notes text DEFAULT '' NOT NULL,
    reference_url text DEFAULT '' NOT NULL, category text DEFAULT '' NOT NULL,
    completed integer DEFAULT false NOT NULL, created_at text NOT NULL, updated_at text NOT NULL
  )`)).catch(error=>{initialization=undefined;throw error;});
  await initialization;
}
export async function listTasks(){await ready();return db.select().from(personalTasks).orderBy(asc(personalTasks.completed),desc(personalTasks.createdAt),asc(personalTasks.id));}
export async function createTask(input:TaskInput){await ready();const now=new Date().toISOString();const [row]=await db.insert(personalTasks).values({...input,id:crypto.randomUUID(),completed:false,createdAt:now,updatedAt:now}).returning();return row;}
export async function updateTask(id:string,patch:Partial<TaskInput>&{completed?:boolean}){await ready();const [row]=await db.update(personalTasks).set({...patch,updatedAt:new Date().toISOString()}).where(eq(personalTasks.id,id)).returning();return row;}
export async function deleteTask(id:string){await ready();const rows=await db.delete(personalTasks).where(eq(personalTasks.id,id)).returning({id:personalTasks.id});return rows.length>0;}
