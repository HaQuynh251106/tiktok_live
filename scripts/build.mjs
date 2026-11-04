import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'build','Neon-Room-Windows');
const files=['dist','server.mjs','sticker-store.mjs','admin-store.mjs','music-hub.mjs','admin.test.mjs','effects.test.mjs','ASSET-PROMPTS-V7.json','scene-math.test.mjs','ASSET-PROMPTS-V4.json','Mo-Neon-Room.cmd','README.md','ASSET-NOTES.txt','package.json','room-core.test.mjs','server.test.mjs','scripts','.github','.gitignore','.gitattributes'];
await fs.rm(output,{recursive:true,force:true});
await fs.mkdir(output,{recursive:true});
for(const name of files)await fs.cp(path.join(root,name),path.join(output,name),{recursive:true,filter:source=>path.basename(source)!=='custom'});
console.log(`Windows source bundle ready: ${output}`);
