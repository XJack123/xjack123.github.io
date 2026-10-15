(async()=>{
 'use strict';
 const C=JackCore,I=window.JackI18n,t=I?I.t:text=>text; let data=C.clone(window.JACK_DATA),assets={};
 const preview=new URLSearchParams(location.search).get('preview')==='1';
 if(preview){try{const draft=await C.readDraft();if(draft){data=draft.data;assets=draft.assets||{};document.getElementById('preview-bar').hidden=false;}}catch(error){console.warn(error.message);}}
 if(I?.lang==='en'){for(const key of ['intro','bio','school','research','location'])if(data.profile[key+'En'])data.profile[key]=data.profile[key+'En'];data.projects=data.projects.map(p=>({...p,title:p.titleEn||p.title,summary:p.summaryEn||p.summary,body:p.bodyEn||p.body,status:t(p.status)}));data.photos=data.photos.map(p=>({...p,title:p.titleEn||p.title,caption:p.captionEn||p.caption,category:t(p.category)}));}
 const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
 const img=(path,alt)=>{const src=C.imageSource(path,assets);if(!src)return null;const n=el('img');n.src=src;n.alt=alt;n.loading='lazy';return n;};
 function link(href,text,className){const a=el('a',className,text);a.href=href;return a;}
 const local=href=>{const target=href+(preview?(href.includes('?')?'&':'?')+'preview=1':'');return I?I.localizedURL(target):target;};
 const tags=values=>{const n=el('div','tags');for(const t of values||[])n.append(el('span','tag',t));return n;};
 const blank=(id,visible)=>{document.getElementById(id).hidden=!visible;};
 document.getElementById('year').textContent=new Date().getFullYear();
 for(const node of document.querySelectorAll('[data-field]')){const text=data.profile[node.dataset.field]||'';if(node.classList.contains('home-introduction'))node.replaceChildren(...text.split(/\n\s*\n/).filter(Boolean).map(paragraph=>el('p','',paragraph)));else node.textContent=text;}
 if(preview)for(const a of document.querySelectorAll('a[href^="./"]'))if(!a.getAttribute('href').includes('admin.html'))a.href=local(a.getAttribute('href'));
 const menu=document.querySelector('.menu-toggle');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));document.getElementById('main-nav').classList.toggle('open',open);menu.setAttribute('aria-label',t(open?'收起导航':'展开导航'));});
 const page=document.body.dataset.page;
 if(page==='about'){
  const avatar=img(data.profile.avatar,t('Jack 的头像'));if(avatar){document.getElementById('avatar').replaceChildren(avatar);document.getElementById('avatar').dataset.hasPhoto='true';}
  const github=C.safeURL(data.profile.github);if(github)document.getElementById('about-github').href=github;
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.profile.email||'')){const a=document.getElementById('email-link');a.textContent=data.profile.email;a.href='mailto:'+data.profile.email;a.hidden=false;}
  for(const [label,value] of [['学校',data.profile.school],['研究方向',data.profile.research],['所在城市',data.profile.location]])if(value){const row=el('div');row.append(el('dt','',t(label)),el('dd','',value));document.getElementById('profile-details').append(row);}
 }
 function filters(id,items,render){const box=document.getElementById(id);for(const label of ['全部',...new Set(items.filter(Boolean))]){const b=el('button','filter',t(label));b.type='button';b.setAttribute('aria-pressed',label==='全部'?'true':'false');b.addEventListener('click',()=>{for(const x of box.children)x.setAttribute('aria-pressed',String(x===b));render(label);});box.append(b);}render('全部');}
 if(page==='projects')filters('project-filters',data.projects.flatMap(p=>p.tags||[]),filter=>{
  const projects=data.projects.filter(p=>filter==='全部'||(p.tags||[]).includes(filter)),grid=document.getElementById('project-grid');grid.replaceChildren();document.getElementById('project-count').textContent=String(projects.length).padStart(2,'0')+' PROJECTS';blank('projects-empty',projects.length===0);
  for(const p of projects){const card=el('article','project-card'),cover=link(local('./project.html?id='+encodeURIComponent(p.id)),'','project-cover');cover.setAttribute('aria-label',p.title);const image=img(p.cover,p.title);cover.append(image||el('span','','AI /'));const body=el('div','project-card-body');body.append(tags(p.tags),el('h2','',p.title),el('p','',p.summary));const bottom=el('div','project-card-bottom');bottom.append(el('span','',p.year+' · '+p.status),link(local('./project.html?id='+encodeURIComponent(p.id)),t('查看项目 ↗'),'project-link'));body.append(bottom);card.append(cover,body);grid.append(card);}
 });
 if(page==='project'){
  const p=data.projects.find(p=>p.id===new URLSearchParams(location.search).get('id'));
  if(!p)blank('project-missing',true);else{document.title=p.title+' — Jack';const root=document.getElementById('project-detail'),head=el('header','detail-heading');head.append(tags(p.tags),el('h1','',p.title),el('p','',p.summary),el('span','mono',p.year+' / '+p.status));root.append(head);const cover=img(p.cover,p.title);if(cover){cover.className='detail-cover';root.append(cover);}root.append(el('div','detail-body',p.body));const url=C.safeURL(p.url);if(url){const a=link(url,t('访问项目 ↗'),'button accent');a.target='_blank';a.rel='noopener noreferrer';root.append(a);}if(p.files?.length){const box=el('section','detail-files');box.append(el('h2','',t('项目文件')));for(const f of p.files){const href=assets[f.path]?.dataURL||C.safeURL(f.path);if(!href)continue;const a=link(href,'','file-link');a.download=f.name;a.append(el('span','',f.name),el('span','',t('下载 ↓')));box.append(a);}root.append(box);}}
 }
 const notes=(data.notes||[]).filter(n=>preview||n.status==='published').map(n=>I?.lang==='en'?{...n,title:n.titleEn||n.title,summary:n.summaryEn||n.summary,body:n.bodyEn||n.body}:n);
 const minutes=body=>Math.max(1,Math.ceil(((body.match(/[\u3400-\u9fff]/g)||[]).length/400)+(body.replace(/[\u3400-\u9fff]/g,' ').split(/\s+/).filter(Boolean).length/220)));
 function renderWriting(text){
  const out=el('div','note-body'),lines=text.replace(/\r/g,'').split('\n');let paragraph=[],code=null,list=null;
  const flush=()=>{if(paragraph.length){out.append(el('p','',paragraph.join('\n')));paragraph=[];}list=null;};
  for(const line of lines){if(/^\s*```/.test(line)){flush();if(code!==null){const pre=el('pre'),node=el('code','',code.join('\n'));pre.append(node);out.append(pre);code=null;}else code=[];continue;}if(code!==null){code.push(line);continue;}if(!line.trim()){flush();continue;}const heading=line.match(/^(#{1,3})\s+(.+)$/);if(heading){flush();out.append(el(heading[1].length===1?'h2':'h3','',heading[2]));continue;}const bullet=line.match(/^[-*]\s+(.+)$/);if(bullet){if(paragraph.length)flush();if(!list){list=el('ul');out.append(list);}list.append(el('li','',bullet[1]));continue;}if(/^>\s?/.test(line)){flush();out.append(el('blockquote','',line.replace(/^>\s?/,'')));continue;}if(list)list=null;paragraph.push(line);}
  flush();if(code!==null){const pre=el('pre');pre.append(el('code','',code.join('\n')));out.append(pre);}return out;
 }
 if(page==='notes'){
  let category='全部';const box=document.getElementById('note-filters'),search=document.getElementById('note-search');
  function render(){const query=search.value.trim().toLowerCase();const selected=notes.filter(n=>(category==='全部'||n.category===category)&&[n.title,n.summary,n.body,...(n.tags||[])].join(' ').toLowerCase().includes(query)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.updatedAt||'').localeCompare(a.updatedAt||''));const grid=document.getElementById('notes-list');grid.replaceChildren();document.getElementById('note-count').textContent=String(selected.length).padStart(2,'0')+' NOTES';blank('notes-empty',notes.length===0);blank('notes-no-results',notes.length>0&&selected.length===0);
   for(const n of selected){const card=el('article','note-card'),meta=el('div','note-meta mono',[(n.date||''),t(n.category),minutes(n.body)+' '+t('分钟阅读'),n.status!=='published'?t('草稿预览'):null].filter(Boolean).join(' / '));const title=el('h2');title.append(link(local('./note.html?id='+encodeURIComponent(n.id)),n.title));card.append(meta,title,el('p','note-summary',n.summary||n.body.replace(/[#>`]/g,'').slice(0,140)));const bottom=el('div','note-bottom');bottom.append(tags(n.tags),link(local('./note.html?id='+encodeURIComponent(n.id)),t('阅读 →'),'project-link'));card.append(bottom);grid.append(card);}
  }
  for(const label of ['全部',...new Set(notes.map(n=>n.category).filter(Boolean))]){const b=el('button','filter',t(label));b.type='button';b.setAttribute('aria-pressed',String(label===category));b.addEventListener('click',()=>{category=label;for(const x of box.children)x.setAttribute('aria-pressed',String(x===b));render();});box.append(b);}search.addEventListener('input',render);render();
 }
 if(page==='note'){
  const n=notes.find(n=>n.id===new URLSearchParams(location.search).get('id'));if(!n)blank('note-missing',true);else{document.title=n.title+' — Jack';const root=document.getElementById('note-detail'),head=el('header','detail-heading');head.append(el('p','note-meta mono',[n.date,t(n.category),minutes(n.body)+' '+t('分钟阅读')].filter(Boolean).join(' / ')),el('h1','',n.title));if(n.status!=='published')head.append(el('span','tag',t('草稿预览')));if(n.summary)head.append(el('p','',n.summary));head.append(tags(n.tags));root.append(head,renderWriting(n.body));}
 }

 const dialog=document.getElementById('lightbox');dialog.querySelector('button').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{document.body.style.overflow='';});
 if(page==='gallery')filters('photo-filters',data.photos.map(p=>p.category),filter=>{
  const photos=data.photos.filter(p=>filter==='全部'||p.category===filter),grid=document.getElementById('photo-grid');grid.replaceChildren();document.getElementById('photo-count').textContent=String(photos.length).padStart(2,'0')+' MOMENTS';blank('photos-empty',photos.length===0);
  for(const p of photos){const image=img(p.src,p.title);if(!image)continue;const fig=el('figure','photo-item'),b=el('button','photo-button');b.type='button';b.setAttribute('aria-label',t('放大照片：')+p.title);b.append(image);b.addEventListener('click',()=>{const big=dialog.querySelector('img');big.src=image.src;big.alt=p.title;dialog.querySelector('p').textContent=[p.title,p.caption,p.date,p.location].filter(Boolean).join(' · ');dialog.showModal();document.body.style.overflow='hidden';});const cap=el('figcaption'),copy=el('div');copy.append(el('h2','',p.title),el('p','',[p.caption,p.location].filter(Boolean).join(' · ')));cap.append(copy,el('span','mono',p.date||p.category));fig.append(b,cap);grid.append(fig);}
 });
})().catch(error=>{console.error('页面加载失败',error);const n=document.createElement('p');n.setAttribute('role','alert');n.textContent=window.JackI18n?JackI18n.t('页面内容暂时无法加载，请刷新重试。'):'页面内容暂时无法加载，请刷新重试。';document.getElementById('main').append(n);});
