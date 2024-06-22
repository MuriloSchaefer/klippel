import{c as a,e as T,d as R,R as w}from"../vendor-efd8fb1e.js";import{M as J,C as q,D as z}from"./Composer/components-b4c2f2df.js";import{A as r,c as K,r as Q,d as W,S as G,a as j,l as X,b as U,u as Z,e as E,f as oo,g as so,h as to,i as S,j as eo,k as io,m as no}from"../kernel-d84f35dc.js";import{u as ao}from"./Composer/hooks-676d1a8a.js";const n="Composer",ro="0.0.1",_=a(`[${n}:Compositions:${r.COMMAND}] Add material`),ko=a(`[${n}:Compositions:${r.COMMAND}] Add material type`),co=a(`[${n}:Compositions:${r.COMMAND}] Change material`),O=a(`[${n}:Compositions:${r.COMMAND}] Select part`),y=a(`[${n}:Compositions:${r.COMMAND}] Unselect part`),b=a(`[${n}:Compositions:${r.COMMAND}] Add to budget`),A=a(`[${n}:Compositions:${r.COMMAND}] Change grade counter`),po=a(`[${n}:Compositions:${r.COMMAND}] Add Proxy`),mo=a(`[${n}:Compositions:${r.COMMAND}] Delete Proxy`);a(`[${n}:Compositions:${r.COMMAND}] Update Proxy`);const go=a(`[${n}:Compositions:${r.COMMAND}] Add Restriction`),lo=a(`[${n}:Compositions:${r.COMMAND}] Delete Restriction`),Co=a(`[${n}:Compositions:${r.COMMAND}] Update Restriction`),v=a(`[${n}:Compositions:${r.COMMAND}] Open debug viewport`);a(`[${n}:Compositions:${r.COMMAND}] Create debug viewport`);const Mo=a(`[${n}:Compositions:${r.EVENT}] Material added`);a(`[${n}:Compositions:${r.EVENT}] Material type added`);const ho=a(`[${n}:Compositions:${r.EVENT}] Part selected`),uo=a(`[${n}:Compositions:${r.EVENT}] Part unselected`),No=a(`[${n}:Compositions:${r.EVENT}] Material changed`),fo=a(`[${n}:Compositions:${r.EVENT}] Proxy added`),$o=a(`[${n}:Compositions:${r.EVENT}] Proxy deleted`);a(`[${n}:Compositions:${r.EVENT}] Proxy updated`);const Io=a(`[${n}:Compositions:${r.EVENT}] Restriction added`),Eo=a(`[${n}:Compositions:${r.EVENT}] Restriction deleted`),yo=a(`[${n}:Compositions:${r.EVENT}] Restriction updated`),xo=a(`[${n}:Compositions:${r.EVENT}] Debug viewport opened`);a(`[${n}:Compositions:${r.EVENT}] Debug viewport closed`);const So=a(`[${n}:Compositions:${r.EVENT}] Added to budget`),Oo=a(`[${n}:Compositions:${r.EVENT}] Grade counter changed`),bo=a(`[${n}:Compositions:${r.COMMAND}] List compositions`),L=a(`[${n}:Compositions:${r.COMMAND}] Store compositions list`),k=a(`[${n}:Compositions:${r.COMMAND}] Create composition`),V=a(`[${n}:Compositions:${r.COMMAND}] Close composition`);a(`[${n}:Compositions:${r.COMMAND}] Parse SVG`);const D=a(`[${n}:Compositions:${r.COMMAND}] Fetch model `),B=a(`[${n}:Compositions:${r.COMMAND}] Store model`),F=a(`[${n}:Compositions:${r.COMMAND}] Load proxies`),Ao=a(`[${n}:Compositions:${r.COMMAND}] Compositions listed`),vo=a(`[${n}:Compositions:${r.COMMAND}] Stored compositions list`),Lo=a(`[${n}:Compositions:${r.EVENT}] Composition created`),Vo=a(`[${n}:Compositions:${r.EVENT}] Composition closed`);a(`[${n}:Compositions:${r.EVENT}] SVG parsed`);const Y=a(`[${n}:Compositions:${r.EVENT}] Model fetched`),Do=a(`[${n}:Compositions:${r.EVENT}] Proxies loaded`),H=a(`[${n}:Compositions:${r.EVENT}] Model stored`),Bo=t=>t.Composer,N=T();N.startListening({actionCreator:bo,effect:async({payload:t},o)=>{const{dispatch:s}=o,e=[{name:"Camisa polo feminina",svgPath:"catalog/camisa-polo/decorated.svg",descriptionPath:"catalog/camisa-polo/description.md"}];s(L(e)),s(Ao(e))}});N.startListening({actionCreator:L,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(vo(t))}});N.startListening({actionCreator:k,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e();s(Lo(i.compositions[t.name]))}});N.startListening({actionCreator:K,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e();Object.values(i.compositions).forEach(c=>{c.viewportName===t.name&&s(V({name:c.name,graphId:c.graphId})),c.debugViewport===t.name&&s(Q({viewportName:c.name}))})}});N.startListening({actionCreator:V,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(W({graphId:t.graphId})),s(Vo({name:t.name}))}});N.startListening({actionCreator:G,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e(),c=Object.values(i.compositions).filter(g=>g.svgPath===t.path);if(!t.content)return;const d=new DOMParser().parseFromString(t.content,"image/svg+xml").getElementsByTagName("modelPath").item(0)?.innerHTML;d&&c.forEach(g=>{g.loading.loadModel==="not-started"&&s(D({compositionName:g.name,modelPath:d}))})}});N.startListening({actionCreator:D,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e(),c=i.compositions[t.compositionName],p=await(await(await fetch(t.modelPath)).blob()).text();s(Y({compositionName:c.name,model:JSON.parse(p)}))}});N.startListening({actionCreator:Y,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e(),c=i.compositions[t.compositionName];s(F({compositionName:c.name,model:t.model})),s(B({compositionName:c.name,model:t.model}))}});N.startListening({actionCreator:F,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i},Materials:{materials:c}}=e(),m=i.compositions[t.compositionName],p=t.model.nodes;Object.values(p).forEach(d=>{if(!("proxies"in d))return;const g=p[d.materialId];g||console.warn(`Missing material node ${d.materialId}! parsing material id`);const l=g?.materialId??d.materialId.split("-")[1],u=c[l],M=d.proxies.reduce((f,C)=>({...f,[C.elem]:{...f[C.elem],[C.attr]:u.attributes.cor.hex}}),{});Object.entries(M).forEach(([f,C])=>{s(j({path:m.svgPath,instanceName:m.name,id:f,styles:C}))})}),s(Do({compositionName:m.name,model:t.model}))}});N.startListening({actionCreator:B,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e(),c=i.compositions[t.compositionName];s(X({graphId:c.graphId,graph:t.model})),s(H({compositionName:c.name,model:t.model}))}});N.startListening({actionCreator:v,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i}}=e();i.compositions[t.compositionName],s(xo({compositionName:t.compositionName,viewportName:t.debugViewport}))}});const h=T();h.startListening({actionCreator:_,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:i},Materials:{materials:c,materialTypes:m}}=e(),p=c[t.materialId],d=m[p.type],g=d.schemas[d.latestSchema],l=i.compositions[t.compositionName].graphId,u=`material-${t.materialId}`,M={id:u,type:"MATERIAL",label:p.attributes[g.selector.principal],materialId:t.materialId,position:{x:0,y:0}};s(U({graphId:l,node:M,edges:{inputs:{},outputs:{}}})),s(Mo({compositionName:t.compositionName,materialId:t.materialId,nodeId:u}))}});h.startListening({actionCreator:co,effect:async({payload:{compositionName:t,materialUsageId:o,materialId:s}},e)=>{const{dispatch:i,getState:c}=e,m=c(),p=m.Composer.compositionsManager.compositions[t],d=m.Graph.graphs[p.graphId],g=m.Materials.materials[s],l=`material-${s}`;l in d.nodes||i(_({compositionName:p.name,materialId:s}));const M=d.nodes[o],f=Object.values(d.edges).filter(C=>C.sourceId===o&&C.type=="CONSUMES");if("proxies"in M&&M.proxies.length>0&&"cor"in g.attributes){const C=M.proxies.reduce(($,{attr:x,elem:P})=>({...$,[P]:{...$[P],[x]:g.attributes.cor.hex}}),{});Object.entries(C).forEach(([$,x])=>{i(Z({path:p.svgPath,instanceName:p.name,id:$,changes:x}))})}i(E({graphId:p.graphId,nodeId:o,changes:{materialId:l}})),i(oo({edge:{id:`${o}->${l}`,sourceId:o,targetId:l,type:"CONSUMES"},graphId:p.graphId})),f.forEach(C=>{i(so({graphId:p.graphId,edgeId:C.id}))}),i(No({compositionName:t,materialUsageId:o,materialId:l}))}});h.startListening({actionCreator:O,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(ho(t))}});h.startListening({actionCreator:to,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:i}}}=e(),c=Object.values(i).find(m=>m.viewportName===t.viewportName);c&&s(y({compositionName:c.name}))}});h.startListening({actionCreator:y,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(uo({compositionName:t.compositionName}))}});h.startListening({actionCreator:go,effect:async({payload:{compositionName:t,materialId:o,restriction:s}},e)=>{const{dispatch:i,getState:c}=e,{Composer:{compositionsManager:{compositions:m}},Graph:{graphs:p}}=c(),d=m[t],{searchResults:g}=p[d.graphId];i(U({graphId:d.graphId,node:s,edges:{inputs:{[o]:{id:`${o}->${s.id}`,type:"RESTRICTED_BY",attr:s.attribute,sourceId:o,targetId:s.id}},outputs:{}}})),Object.entries(g).filter(([l,u])=>!!l.includes("restriction")).forEach(([l,u])=>i(S({graphId:d.graphId,searchId:l}))),i(Io({compositionName:t,materialId:o,restrictionId:s.id}))}});h.startListening({actionCreator:Co,effect:async({payload:{compositionName:t,materialId:o,restrictionId:s,changes:e}},i)=>{const{dispatch:c,getState:m}=i,{Composer:{compositionsManager:{compositions:p}},Graph:{graphs:d}}=m(),g=p[t],{searchResults:l}=d[g.graphId];c(E({graphId:g.graphId,nodeId:s,changes:e})),Object.entries(l).filter(([u,M])=>!!M.findings.find(f=>f.id===s)).forEach(([u,M])=>c(S({graphId:g.graphId,searchId:u}))),c(yo({compositionName:t,materialId:o,restrictionId:s}))}});h.startListening({actionCreator:lo,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:i}},Graph:{graphs:c}}=e(),m=i[t.compositionName],{searchResults:p}=c[m.graphId];s(eo({graphId:m.graphId,nodeId:t.restrictionId})),Object.entries(p).filter(([d,g])=>!!g.findings.find(l=>l.id===t.restrictionId)).forEach(([d,g])=>s(S({graphId:m.graphId,searchId:d}))),s(Eo(t))}});h.startListening({actionCreator:mo,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:i}},Graph:{graphs:c}}=e(),m=i[t.compositionName],p=c[m.graphId];if(!m.selectedPart){console.warn("trying to delete proxy without selecting a part");return}const d=p.nodes[t.materialId];if(!("proxies"in d))return;const g=d.proxies.filter(l=>l.elem!==t.proxyId);s(E({graphId:m.graphId,nodeId:t.materialId,changes:{proxies:g}})),s(io({path:m.svgPath,instanceName:m.name,id:t.proxyId})),s($o(t))}});h.startListening({actionCreator:po,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:i}},Graph:{graphs:c},Materials:{materials:m}}=e(),p=i[t.compositionName],d=c[p.graphId];if(!p.selectedPart){console.error("trying to delete proxy without selecting a part");return}const g=d.nodes[t.materialId];if(!("proxies"in g)){console.error("trying to add proxy in an node that does not support proxies");return}const l=[...g.proxies,t.proxy],u=Number(g.materialId.split("-")[1]),M=m[u];if(!("cor"in M.attributes)){console.error("material does not have a color attribute ");return}const f=l.filter(C=>C.elem===t.proxy.elem).reduce((C,$)=>({...C,[$.attr]:M.attributes.cor.hex}),{});s(E({graphId:p.graphId,nodeId:t.materialId,changes:{proxies:l}})),s(j({path:p.svgPath,instanceName:p.name,id:t.proxy.elem,styles:f})),s(fo(t))}});h.startListening({actionCreator:b,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(So({budgetId:t.budgetId,compositionName:t.compositionName}))}});h.startListening({actionCreator:A,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(Oo(t))}});const Po={loading:{loadSVG:"not-started",loadModel:"not-started"},budget:void 0},wo={compositionsManager:{compositions:{},compositionsList:[]}},I=R({name:n,initialState:{},reducers:{},extraReducers:t=>{t.addCase(O,(o,{payload:{partName:s}})=>({...o,selectedPart:s})),t.addCase(b,(o,{payload:{budgetId:s,gradesInfo:e}})=>({...o,budget:{budgetId:s,grades:e.reduce((i,c)=>({...i,[c]:0}),{})}})),t.addCase(A,(o,{payload:{gradeId:s,counter:e}})=>({...o,budget:o.budget?{...o.budget,grades:{...o.budget.grades,[s]:e}}:void 0})),t.addCase(y,o=>({...o,selectedPart:void 0})),t.addCase(v,(o,{payload:s})=>({...o,debugViewport:s.debugViewport}))}}),To=R({name:n,initialState:wo,reducers:{},extraReducers:t=>{t.addCase(k,(o,{payload:{name:s,viewportName:e,svgPath:i,graphId:c}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s]:{...Po,name:s,svgPath:i,graphId:c,viewportName:e}}}})).addCase(L,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositionsList:s.payload}})).addCase(V,(o,{payload:{name:s}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:Object.values(o.compositionsManager.compositions).reduce((e,i)=>i.name===s?e:{...e,[i.name]:i},{})}})).addCase(no,(o,{payload:{path:s}})=>{const e=Object.values(o.compositionsManager.compositions).find(i=>i.svgPath===s);return e?{...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[e.name]:{...e,loading:{...e.loading,loadSVG:"started"}}}}}:o}),t.addCase(G,(o,{payload:{path:s}})=>{const e=Object.values(o.compositionsManager.compositions).find(i=>i.svgPath===s);return e?{...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[e.name]:{...e,loading:{...e.loading,loadSVG:"completed"}}}}}:o}),t.addCase(D,(o,{payload:{compositionName:s}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s]:{...o.compositionsManager.compositions[s],loading:{...o.compositionsManager.compositions[s].loading,loadModel:"started"}}}}})),t.addCase(H,(o,{payload:s})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.compositionName]:{...o.compositionsManager.compositions[s.compositionName],loading:{...o.compositionsManager.compositions[s.compositionName].loading,loadModel:"completed"}}}}})),t.addCase(O,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(y,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(v,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(b,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(A,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}}))}});function Ro({managers:{storeManager:t,componentRegistryManager:o,layoutManager:s,ribbonMenuManager:e,viewportManager:i}}){t.functions.loadReducer(n,To.reducer),t.functions.registerMiddleware(N),t.functions.registerMiddleware(h),o.functions.registerComponents({ribbonMenuSections:{ModelSelector:w.memo(J)},viewportTypes:{Composer:w.memo(q),DebuggerViewport:z}}),e.functions.addNewTab({label:"Compositor",sectionNames:["ModelSelector"],type:"base"})}const Fo={name:n,version:ro,depends_on:["Layout","Graph","SVG","Materials","Converter"],components:{},hooks:{useComposition:ao},kernelCalls:{startModule:Ro,restartModule(){},shutdownModule(){}}};export{b as a,go as b,A as c,lo as d,ko as e,co as f,po as g,mo as h,Bo as i,k as j,bo as l,Fo as m,v as o,O as s,Co as u};
