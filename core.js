/* Shared data helpers. No credentials are stored here. */
window.JackCore = (() => {
 'use strict';
 const clone = value => JSON.parse(JSON.stringify(value));
 function openDB() {
  return new Promise((resolve,reject) => {
   const request = indexedDB.open('jack-studio-v2',1);
   request.onupgradeneeded = () => request.result.createObjectStore('drafts');
   request.onsuccess = () => resolve(request.result);
   request.onerror = () => reject(new Error('无法使用浏览器草稿存储，请退出无痕模式或换一个浏览器。'));
  });
 }
 async function dbAction(mode,callback) {
  const db=await openDB();
  try { return await new Promise((resolve,reject)=>{
   const tx=db.transaction('drafts',mode); const req=callback(tx.objectStore('drafts'));
   tx.oncomplete=()=>resolve(req.result); tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error || new Error('草稿保存被中止'));
  }); } finally { db.close(); }
 }
 const readDraft=async()=>{
  if(['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).get('preview')==='1'){
   const response=await fetch('/api/draft');
   if(response.ok)return (await response.json()).state;
   throw new Error('本机草稿无法读取，请确认管理台运行中。');
  }
  return dbAction('readonly',store=>store.get('current'));
 };
 const writeDraft=value=>dbAction('readwrite',store=>store.put(value,'current'));
 const clearDraft=()=>dbAction('readwrite',store=>store.delete('current'));
 function safeURL(value,{image=false}={}) {
  if(typeof value!=='string'||!value) return '';
  if(image && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
  if(/^assets\/uploads\/[a-zA-Z0-9._-]+$/.test(value)) return './'+value;
  if(!image) { try { const url=new URL(value); if(url.protocol==='https:'||url.protocol==='http:') return url.href; } catch {} }
  return '';
 }
 function dataFile(data){return 'window.JACK_DATA = '+JSON.stringify(data,null,2)+';\n';}
 function parseDataFile(text){
  const match=text.trim().match(/^window\.JACK_DATA\s*=\s*([\s\S]+);$/);
  if(!match) throw new Error('仓库中的内容文件格式不正确。');
  const data=JSON.parse(match[1]);
  if(data.version!==2||!data.profile||!Array.isArray(data.projects)||!Array.isArray(data.photos)) throw new Error('内容版本不匹配，请先部署新版网站。');
  if(data.notes!==undefined&&!Array.isArray(data.notes))throw new Error('笔记数据格式不正确。');
  data.notes=data.notes||[];
  return data;
 }
 function normalizeData(data){if(data.notes===undefined)data.notes=[];return data;}
 function photoTitle(photo,assets={}){
  const title=photo.title||'',name=assets[photo.src]?.name||photo.originalName||'';
  const stem=name.replace(/\.[^.]+$/,'');
  if((name&&(title===name||title===stem))||/^(?:IMG[_ -]?|DSC[FNO]?[_ -]?|PXL[_ -]?|DJI[_ -]?|DCIM[_ -]?)\d[\w .()-]*$/i.test(title)||/\.(?:jpe?g|png|webp|gif|heic|heif|dng)$/i.test(title))return '';
  return title;
 }

 function publicData(data){const out=clone(data);out.notes=(out.notes||[]).filter(n=>n.status==='published');return out;}
 function imageSource(path,assets={}){return assets[path]?.dataURL || safeURL(path,{image:true});}
 const usedPaths=data=>new Set([data.profile.avatar,...data.photos.map(p=>p.src),...data.projects.flatMap(p=>[p.cover,...(p.files||[]).map(f=>f.path)])].filter(Boolean));
 function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
 function zip(files){
  const enc=new TextEncoder(),parts=[],entries=[];let offset=0;
  for(const file of files){
   const name=enc.encode(file.name),bytes=typeof file.data==='string'?enc.encode(file.data):file.data;
   const header=new Uint8Array(30+name.length),v=new DataView(header.buffer),crc=crc32(bytes);
   v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,name.length,true);header.set(name,30);
   parts.push(header,bytes);entries.push({name,bytes,crc,offset});offset+=header.length+bytes.length;
  }
  const start=offset;
  for(const e of entries){const h=new Uint8Array(46+e.name.length),v=new DataView(h.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,0x21,true);v.setUint32(16,e.crc,true);v.setUint32(20,e.bytes.length,true);v.setUint32(24,e.bytes.length,true);v.setUint16(28,e.name.length,true);v.setUint32(42,e.offset,true);h.set(e.name,46);parts.push(h);offset+=h.length;}
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,offset-start,true);v.setUint32(16,start,true);parts.push(end);return new Blob(parts,{type:'application/zip'});
 }
 function dataBytes(dataURL){return Uint8Array.from(atob(dataURL.split(',')[1]),c=>c.charCodeAt(0));}
 function download(blob,name){const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),15000);}
 return {photoTitle,clone,normalizeData,publicData,readDraft,writeDraft,clearDraft,safeURL,dataFile,parseDataFile,imageSource,usedPaths,zip,dataBytes,download};
})();
