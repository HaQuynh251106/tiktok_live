import fs from 'node:fs/promises';
import path from 'node:path';
import {defaultConfig,validateConfig,migrateConfig} from './dist/admin-config.mjs';

export async function createAdminStore(folder){
  const file=path.join(folder,'admin-config.json');let config=defaultConfig(),writes=Promise.resolve();
  try{config=migrateConfig(JSON.parse(await fs.readFile(file,'utf8')));}catch(error){if(error.code!=='ENOENT')throw Error(`Không đọc được cấu hình admin: ${error.message}`);}
  return {get config(){return config;},save(patch){
    const task=writes.then(async()=>{const next=validateConfig({...config,...patch});await fs.mkdir(folder,{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(next,null,2)+'\n');await fs.rename(file+'.tmp',file);config=next;return next;});
    writes=task.catch(()=>{});return task;
  }};
}
