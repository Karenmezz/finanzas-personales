import { cookies } from "next/headers";
import { sessionCookieName,verifySessionToken } from "@/auth/session";
import { createTask,deleteTask,listTasks,updateTask } from "@/data/tasks-data";
import { parseTaskInput,parseTaskPatch } from "@/lib/tasks";
export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store"};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers});
async function authorized(){return verifySessionToken((await cookies()).get(sessionCookieName)?.value);}
async function body(request:Request){const text=await request.text();if(text.length>12000)return null;try{return JSON.parse(text) as unknown;}catch{return null;}}
function withId(value:unknown):value is Record<string,unknown>&{id:string}{return Boolean(value&&typeof value==="object"&&!Array.isArray(value)&&typeof (value as {id?:unknown}).id==="string"&&/^[a-f0-9-]{36}$/i.test((value as {id:string}).id));}
export async function GET(){if(!await authorized())return json({error:"No autorizado"},401);try{return json(await listTasks());}catch{return json({error:"No fue posible cargar los pendientes"},500);}}
export async function POST(request:Request){if(!await authorized())return json({error:"No autorizado"},401);const input=parseTaskInput(await body(request));if(!input)return json({error:"Revisa el título y el enlace de referencia"},400);try{return json(await createTask(input),201);}catch{return json({error:"No fue posible guardar el pendiente"},500);}}
export async function PATCH(request:Request){if(!await authorized())return json({error:"No autorizado"},401);const value=await body(request);if(!withId(value))return json({error:"Datos inválidos"},400);const {id,...input}=value;const patch=parseTaskPatch(input);if(!patch)return json({error:"Revisa los datos del pendiente"},400);try{const row=await updateTask(id,patch);return row?json(row):json({error:"No se encontró el pendiente"},404);}catch{return json({error:"No fue posible actualizar el pendiente"},500);}}
export async function DELETE(request:Request){if(!await authorized())return json({error:"No autorizado"},401);const value=await body(request);if(!withId(value))return json({error:"Datos inválidos"},400);try{return await deleteTask(value.id)?json({ok:true}):json({error:"No se encontró el pendiente"},404);}catch{return json({error:"No fue posible eliminar el pendiente"},500);}}
