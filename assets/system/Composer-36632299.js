import{c as a,e as j,d as B,R}from"../vendor-e4518210.js";import{M as oo,C as so,D as to}from"./Composer/components-4c8e1e21.js";import{A as r,c as eo,r as io,d as no,S as U,a as k,l as ao,b as F,u as ro,e as co,f as y,g as mo,h as po,o as go,i as lo,j as b,k as Co,m as Mo,n as ho}from"../kernel-5843a605.js";import{u as uo}from"./Composer/hooks-37501076.js";const n="Composer",No="0.0.1",_=a(`[${n}:Compositions:${r.COMMAND}] Add material`),Qo=a(`[${n}:Compositions:${r.COMMAND}] Add material type`),$o=a(`[${n}:Compositions:${r.COMMAND}] Change material`),S=a(`[${n}:Compositions:${r.COMMAND}] Select part`),x=a(`[${n}:Compositions:${r.COMMAND}] Unselect part`),A=a(`[${n}:Compositions:${r.COMMAND}] Add to budget`),z=a(`[${n}:Compositions:${r.COMMAND}] Add grade to budget`),P=a(`[${n}:Compositions:${r.COMMAND}] Change grade counter`),fo=a(`[${n}:Compositions:${r.COMMAND}] Add Proxy`),Io=a(`[${n}:Compositions:${r.COMMAND}] Delete Proxy`);a(`[${n}:Compositions:${r.COMMAND}] Update Proxy`);const Eo=a(`[${n}:Compositions:${r.COMMAND}] Add Restriction`),yo=a(`[${n}:Compositions:${r.COMMAND}] Delete Restriction`),So=a(`[${n}:Compositions:${r.COMMAND}] Update Restriction`),V=a(`[${n}:Compositions:${r.COMMAND}] Open debug viewport`);a(`[${n}:Compositions:${r.COMMAND}] Create debug viewport`);const xo=a(`[${n}:Compositions:${r.EVENT}] Material added`);a(`[${n}:Compositions:${r.EVENT}] Material type added`);const Oo=a(`[${n}:Compositions:${r.EVENT}] Part selected`),vo=a(`[${n}:Compositions:${r.EVENT}] Part unselected`),bo=a(`[${n}:Compositions:${r.EVENT}] Material changed`),Ao=a(`[${n}:Compositions:${r.EVENT}] Proxy added`),Po=a(`[${n}:Compositions:${r.EVENT}] Proxy deleted`);a(`[${n}:Compositions:${r.EVENT}] Proxy updated`);const Vo=a(`[${n}:Compositions:${r.EVENT}] Restriction added`),Do=a(`[${n}:Compositions:${r.EVENT}] Restriction deleted`),Lo=a(`[${n}:Compositions:${r.EVENT}] Restriction updated`),wo=a(`[${n}:Compositions:${r.EVENT}] Debug viewport opened`);a(`[${n}:Compositions:${r.EVENT}] Debug viewport closed`);const To=a(`[${n}:Compositions:${r.EVENT}] Added to budget`);a(`[${n}:Compositions:${r.EVENT}] Grade added to budget`);const Go=a(`[${n}:Compositions:${r.EVENT}] Grade counter changed`),Ro=a(`[${n}:Compositions:${r.COMMAND}] List compositions`),D=a(`[${n}:Compositions:${r.COMMAND}] Store compositions list`),Y=a(`[${n}:Compositions:${r.COMMAND}] Create composition`),L=a(`[${n}:Compositions:${r.COMMAND}] Close composition`);a(`[${n}:Compositions:${r.COMMAND}] Parse SVG`);const w=a(`[${n}:Compositions:${r.COMMAND}] Fetch model `),q=a(`[${n}:Compositions:${r.COMMAND}] Store model`),H=a(`[${n}:Compositions:${r.COMMAND}] Load proxies`),jo=a(`[${n}:Compositions:${r.COMMAND}] Compositions listed`),Bo=a(`[${n}:Compositions:${r.COMMAND}] Stored compositions list`),Uo=a(`[${n}:Compositions:${r.EVENT}] Composition created`),ko=a(`[${n}:Compositions:${r.EVENT}] Composition closed`);a(`[${n}:Compositions:${r.EVENT}] SVG parsed`);const J=a(`[${n}:Compositions:${r.EVENT}] Model fetched`),Fo=a(`[${n}:Compositions:${r.EVENT}] Proxies loaded`),X=a(`[${n}:Compositions:${r.EVENT}] Model stored`),Wo=t=>t.Composer,N=j();N.startListening({actionCreator:Ro,effect:async({payload:t},o)=>{const{dispatch:s}=o,e=[{name:"Camisa polo feminina",svgPath:"catalog/camisa-polo/decorated.svg",descriptionPath:"catalog/camisa-polo/description.md"}];s(D(e)),s(jo(e))}});N.startListening({actionCreator:D,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(Bo(t))}});N.startListening({actionCreator:Y,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e();s(S({compositionName:t.name,partName:"garment"})),s(Uo(i.compositions[t.name]))}});N.startListening({actionCreator:eo,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e();Object.values(i.compositions).forEach(c=>{c.viewportName===t.name&&s(L({name:c.name,graphId:c.graphId})),c.debugViewport===t.name&&s(io({viewportName:c.name}))})}});N.startListening({actionCreator:L,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(no({graphId:t.graphId})),s(ko({name:t.name}))}});N.startListening({actionCreator:U,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e(),c=Object.values(i.compositions).filter(g=>g.svgPath===t.path);if(!t.content)return;const d=new DOMParser().parseFromString(t.content,"image/svg+xml").getElementsByTagName("modelPath").item(0)?.innerHTML;d&&c.forEach(g=>{g.loading.loadModel==="not-started"&&s(w({compositionName:g.name,modelPath:d}))})}});N.startListening({actionCreator:w,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e(),c=i.compositions[t.compositionName],m=await(await(await fetch(t.modelPath)).blob()).text();s(J({compositionName:c.name,model:JSON.parse(m)}))}});N.startListening({actionCreator:J,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e(),c=i.compositions[t.compositionName];s(H({compositionName:c.name,model:t.model})),s(q({compositionName:c.name,model:t.model}))}});N.startListening({actionCreator:H,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i},Materials:{materials:c}}=e(),p=i.compositions[t.compositionName],m=t.model.nodes;Object.values(m).forEach(d=>{if(!("proxies"in d))return;const g=m[d.materialId];g||console.warn(`Missing material node ${d.materialId}! parsing material id`);const l=g?.materialId??d.materialId.split("-")[1],u=c[l],M=d.proxies.reduce(($,C)=>({...$,[C.elem]:{...$[C.elem],[C.attr]:u.attributes.cor.hex}}),{});Object.entries(M).forEach(([$,C])=>{s(k({path:p.svgPath,instanceName:p.name,id:$,styles:C}))})}),s(Fo({compositionName:p.name,model:t.model}))}});N.startListening({actionCreator:q,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e(),c=i.compositions[t.compositionName];s(ao({graphId:c.graphId,graph:t.model})),s(X({compositionName:c.name,model:t.model}))}});N.startListening({actionCreator:V,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e();i.compositions[t.compositionName],s(wo({compositionName:t.compositionName,viewportName:t.debugViewport}))}});const h=j();h.startListening({actionCreator:_,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i},Materials:{materials:c,materialTypes:p}}=e(),m=c[t.materialId],d=p[m.type],g=d.schemas[d.latestSchema],l=i.compositions[t.compositionName].graphId,u=`material-${t.materialId}`,M={id:u,type:"MATERIAL",label:m.attributes[g.selector.principal],materialId:t.materialId,position:{x:0,y:0}};s(F({graphId:l,node:M,edges:{inputs:{},outputs:{}}})),s(xo({compositionName:t.compositionName,materialId:t.materialId,nodeId:u}))}});h.startListening({actionCreator:$o,effect:async({payload:{compositionName:t,materialUsageId:o,materialId:s}},e)=>{const{dispatch:i,getState:c}=e,p=c(),m=p.Composer.compositionsManager.compositions[t],d=p.Graph.graphs[m.graphId],g=p.Materials.materials[s],l=`material-${s}`;l in d.nodes||i(_({compositionName:m.name,materialId:s}));const M=d.nodes[o],$=Object.values(d.edges).filter(C=>C.sourceId===o&&C.type=="CONSUMES");if("proxies"in M&&M.proxies.length>0&&"cor"in g.attributes){const C=M.proxies.reduce((f,{attr:v,elem:E})=>({...f,[E]:{...f[E],[v]:g.attributes.cor.hex}}),{}),O=p.SVG.svgs[m.svgPath].instances[m.name],K=p.SVG.svgs[m.svgPath].content,T=O.content||K;if(T){const f=new DOMParser().parseFromString(T,"image/svg+xml").querySelector("svg");if(f){Object.entries(C).forEach(([E,G])=>{const Q=f?.getElementById(E);Object.entries(G).forEach(([W,Z])=>{Q?.setAttribute(W,Z)}),i(ro({path:m.svgPath,instanceName:m.name,id:E,changes:G}))});const v=new XMLSerializer().serializeToString(f);i(co({path:m.svgPath,instanceName:m.name,document:v}))}}}i(y({graphId:m.graphId,nodeId:o,changes:{materialId:l}})),i(mo({edge:{id:`${o}->${l}`,sourceId:o,targetId:l,type:"CONSUMES"},graphId:m.graphId})),$.forEach(C=>{i(po({graphId:m.graphId,edgeId:C.id}))}),i(bo({compositionName:t,materialUsageId:o,materialId:l}))}});h.startListening({actionCreator:S,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(go()),s(Oo(t))}});h.startListening({actionCreator:lo,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:i}}}=e(),c=Object.values(i).find(p=>p.viewportName===t.viewportName);c&&s(x({compositionName:c.name}))}});h.startListening({actionCreator:x,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(vo({compositionName:t.compositionName}))}});h.startListening({actionCreator:Eo,effect:async({payload:{compositionName:t,materialId:o,restriction:s}},e)=>{const{dispatch:i,getState:c}=e,{Composer:{compositionsManager:{compositions:p}},Graph:{graphs:m}}=c(),d=p[t],{searchResults:g}=m[d.graphId];i(F({graphId:d.graphId,node:s,edges:{inputs:{[o]:{id:`${o}->${s.id}`,type:"RESTRICTED_BY",attr:s.attribute,sourceId:o,targetId:s.id}},outputs:{}}})),Object.entries(g).filter(([l,u])=>!!l.includes("restriction")).forEach(([l,u])=>i(b({graphId:d.graphId,searchId:l}))),i(Vo({compositionName:t,materialId:o,restrictionId:s.id}))}});h.startListening({actionCreator:So,effect:async({payload:{compositionName:t,materialId:o,restrictionId:s,changes:e}},i)=>{const{dispatch:c,getState:p}=i,{Composer:{compositionsManager:{compositions:m}},Graph:{graphs:d}}=p(),g=m[t],{searchResults:l}=d[g.graphId];c(y({graphId:g.graphId,nodeId:s,changes:e})),Object.entries(l).filter(([u,M])=>!!M.findings.find($=>$.id===s)).forEach(([u,M])=>c(b({graphId:g.graphId,searchId:u}))),c(Lo({compositionName:t,materialId:o,restrictionId:s}))}});h.startListening({actionCreator:yo,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:i}},Graph:{graphs:c}}=e(),p=i[t.compositionName],{searchResults:m}=c[p.graphId];s(Co({graphId:p.graphId,nodeId:t.restrictionId})),Object.entries(m).filter(([d,g])=>!!g.findings.find(l=>l.id===t.restrictionId)).forEach(([d,g])=>s(b({graphId:p.graphId,searchId:d}))),s(Do(t))}});h.startListening({actionCreator:Io,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:i}},Graph:{graphs:c}}=e(),p=i[t.compositionName],m=c[p.graphId];if(!p.selectedPart){console.warn("trying to delete proxy without selecting a part");return}const d=m.nodes[t.materialId];if(!("proxies"in d))return;const g=d.proxies.filter(l=>l.elem!==t.proxyId);s(y({graphId:p.graphId,nodeId:t.materialId,changes:{proxies:g}})),s(Mo({path:p.svgPath,instanceName:p.name,id:t.proxyId})),s(Po(t))}});h.startListening({actionCreator:fo,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:i}},Graph:{graphs:c},Materials:{materials:p}}=e(),m=i[t.compositionName],d=c[m.graphId];if(!m.selectedPart){console.error("trying to delete proxy without selecting a part");return}const g=d.nodes[t.materialId];if(!("proxies"in g)){console.error("trying to add proxy in an node that does not support proxies");return}const l=[...g.proxies,t.proxy],u=Number(g.materialId.split("-")[1]),M=p[u];if(!("cor"in M.attributes)){console.error("material does not have a color attribute ");return}const $=l.filter(C=>C.elem===t.proxy.elem).reduce((C,O)=>({...C,[O.attr]:M.attributes.cor.hex}),{});s(y({graphId:m.graphId,nodeId:t.materialId,changes:{proxies:l}})),s(k({path:m.svgPath,instanceName:m.name,id:t.proxy.elem,styles:$})),s(Ao(t))}});h.startListening({actionCreator:A,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(To({budgetId:t.budgetId,compositionName:t.compositionName}))}});h.startListening({actionCreator:P,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(Go(t))}});const _o={loading:{loadSVG:"not-started",loadModel:"not-started"},selectedPart:void 0,budget:void 0},zo={compositionsManager:{compositions:{},compositionsList:[]}},I=B({name:n,initialState:{},reducers:{},extraReducers:t=>{t.addCase(S,(o,{payload:{partName:s}})=>({...o,selectedPart:s})),t.addCase(A,(o,{payload:{budgetId:s,gradesInfo:e}})=>({...o,budget:{budgetId:s,grades:e.reduce((i,c)=>({...i,[c]:0}),{})}})),t.addCase(z,(o,{payload:{gradeId:s}})=>({...o,budget:{...o.budget,grades:{...o.budget?.grades,[s]:0}}})),t.addCase(P,(o,{payload:{gradeId:s,counter:e}})=>({...o,budget:o.budget?{...o.budget,grades:{...o.budget.grades,[s]:e}}:void 0})),t.addCase(x,o=>({...o,selectedPart:void 0})),t.addCase(V,(o,{payload:s})=>({...o,debugViewport:s.debugViewport}))}}),Yo=B({name:n,initialState:zo,reducers:{},extraReducers:t=>{t.addCase(Y,(o,{payload:{name:s,viewportName:e,svgPath:i,graphId:c}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s]:{..._o,name:s,svgPath:i,graphId:c,viewportName:e}}}})).addCase(D,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositionsList:s.payload}})).addCase(L,(o,{payload:{name:s}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:Object.values(o.compositionsManager.compositions).reduce((e,i)=>i.name===s?e:{...e,[i.name]:i},{})}})).addCase(ho,(o,{payload:{path:s}})=>{const e=Object.values(o.compositionsManager.compositions).find(i=>i.svgPath===s);return e?{...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[e.name]:{...e,loading:{...e.loading,loadSVG:"started"}}}}}:o}),t.addCase(U,(o,{payload:{path:s}})=>{const e=Object.values(o.compositionsManager.compositions).find(i=>i.svgPath===s);return e?{...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[e.name]:{...e,loading:{...e.loading,loadSVG:"completed"}}}}}:o}),t.addCase(w,(o,{payload:{compositionName:s}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s]:{...o.compositionsManager.compositions[s],loading:{...o.compositionsManager.compositions[s].loading,loadModel:"started"}}}}})),t.addCase(X,(o,{payload:s})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.compositionName]:{...o.compositionsManager.compositions[s.compositionName],loading:{...o.compositionsManager.compositions[s.compositionName].loading,loadModel:"completed"}}}}})),t.addCase(S,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(x,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(V,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(A,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(z,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(P,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}}))}});function qo({managers:{storeManager:t,componentRegistryManager:o,layoutManager:s,ribbonMenuManager:e,viewportManager:i}}){t.functions.loadReducer(n,Yo.reducer),t.functions.registerMiddleware(N),t.functions.registerMiddleware(h),o.functions.registerComponents({ribbonMenuSections:{ModelSelector:R.memo(oo)},viewportTypes:{Composer:R.memo(so),DebuggerViewport:to}}),e.functions.addNewTab({label:"Compositor",sectionNames:["ModelSelector"],type:"base"})}const Zo={name:n,version:No,depends_on:["Layout","Graph","SVG","Materials","Converter"],components:{},hooks:{useComposition:uo},kernelCalls:{startModule:qo,restartModule(){},shutdownModule(){}}};export{A as a,z as b,P as c,Eo as d,yo as e,Qo as f,$o as g,fo as h,Io as i,Wo as j,Y as k,Ro as l,Zo as m,V as o,S as s,So as u};
