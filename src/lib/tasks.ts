export const taskCategories=["","Redes","Casa","Personal","Otro"] as const;
export type TaskCategory=(typeof taskCategories)[number];
export type TaskInput={title:string;notes:string;referenceUrl:string;category:TaskCategory};
export type PersonalTask=TaskInput&{id:string;completed:boolean;createdAt:string;updatedAt:string};
export function parseTaskPatch(value:unknown): (Partial<TaskInput>&{completed?:boolean}) | null {
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const input=value as Record<string,unknown>;const patch:Partial<TaskInput>&{completed?:boolean}={};
  if(Object.keys(input).length===0||Object.keys(input).some(key=>!["title","notes","referenceUrl","category","completed"].includes(key)))return null;
  for(const key of ["title","notes","referenceUrl"] as const)if(key in input){if(typeof input[key]!=="string")return null;patch[key]=input[key].trim();}
  if(patch.title!==undefined&&(!patch.title||patch.title.length>200))return null;
  if(patch.notes!==undefined&&patch.notes.length>3000)return null;
  if(patch.referenceUrl!==undefined){if(patch.referenceUrl.length>2048)return null;if(patch.referenceUrl){try{const url=new URL(patch.referenceUrl);if(!["http:","https:"].includes(url.protocol)||url.username||url.password)return null;}catch{return null;}}}
  if("category" in input){if(!taskCategories.includes(input.category as TaskCategory))return null;patch.category=input.category as TaskCategory;}
  if("completed" in input){if(typeof input.completed!=="boolean")return null;patch.completed=input.completed;}
  return patch;
}
export function parseTaskInput(value:unknown):TaskInput|null {
  const patch=parseTaskPatch(value);if(!patch?.title||patch.completed!==undefined)return null;
  return {title:patch.title,notes:patch.notes??"",referenceUrl:patch.referenceUrl??"",category:patch.category??""};
}
