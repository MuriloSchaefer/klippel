import{c as a,e as T,d as G,R as w}from"../vendor-efd8fb1e.js";import{M as q,C as z,D as K}from"./Composer/components-01e733f0.js";import{A as r,c as Q,r as W,d as X,S as R,a as j,l as Z,b as U,u as oo,e as E,f as so,g as to,h as eo,i as S,j as io,k as no,m as ao}from"../kernel-d84f35dc.js";import{u as ro}from"./Composer/hooks-d8477ebd.js";const i="Composer",co="0.0.1",k=a(`[${i}:Compositions:${r.COMMAND}] Add material`),_o=a(`[${i}:Compositions:${r.COMMAND}] Add material type`),po=a(`[${i}:Compositions:${r.COMMAND}] Change material`),O=a(`[${i}:Compositions:${r.COMMAND}] Select part`),y=a(`[${i}:Compositions:${r.COMMAND}] Unselect part`),b=a(`[${i}:Compositions:${r.COMMAND}] Add to budget`),B=a(`[${i}:Compositions:${r.COMMAND}] Add grade to budget`),A=a(`[${i}:Compositions:${r.COMMAND}] Change grade counter`),mo=a(`[${i}:Compositions:${r.COMMAND}] Add Proxy`),go=a(`[${i}:Compositions:${r.COMMAND}] Delete Proxy`);a(`[${i}:Compositions:${r.COMMAND}] Update Proxy`);const lo=a(`[${i}:Compositions:${r.COMMAND}] Add Restriction`),Co=a(`[${i}:Compositions:${r.COMMAND}] Delete Restriction`),Mo=a(`[${i}:Compositions:${r.COMMAND}] Update Restriction`),V=a(`[${i}:Compositions:${r.COMMAND}] Open debug viewport`);a(`[${i}:Compositions:${r.COMMAND}] Create debug viewport`);const ho=a(`[${i}:Compositions:${r.EVENT}] Material added`);a(`[${i}:Compositions:${r.EVENT}] Material type added`);const uo=a(`[${i}:Compositions:${r.EVENT}] Part selected`),No=a(`[${i}:Compositions:${r.EVENT}] Part unselected`),$o=a(`[${i}:Compositions:${r.EVENT}] Material changed`),fo=a(`[${i}:Compositions:${r.EVENT}] Proxy added`),Io=a(`[${i}:Compositions:${r.EVENT}] Proxy deleted`);a(`[${i}:Compositions:${r.EVENT}] Proxy updated`);const Eo=a(`[${i}:Compositions:${r.EVENT}] Restriction added`),yo=a(`[${i}:Compositions:${r.EVENT}] Restriction deleted`),xo=a(`[${i}:Compositions:${r.EVENT}] Restriction updated`),So=a(`[${i}:Compositions:${r.EVENT}] Debug viewport opened`);a(`[${i}:Compositions:${r.EVENT}] Debug viewport closed`);const Oo=a(`[${i}:Compositions:${r.EVENT}] Added to budget`);a(`[${i}:Compositions:${r.EVENT}] Grade added to budget`);const bo=a(`[${i}:Compositions:${r.EVENT}] Grade counter changed`),Ao=a(`[${i}:Compositions:${r.COMMAND}] List compositions`),v=a(`[${i}:Compositions:${r.COMMAND}] Store compositions list`),_=a(`[${i}:Compositions:${r.COMMAND}] Create composition`),D=a(`[${i}:Compositions:${r.COMMAND}] Close composition`);a(`[${i}:Compositions:${r.COMMAND}] Parse SVG`);const L=a(`[${i}:Compositions:${r.COMMAND}] Fetch model `),F=a(`[${i}:Compositions:${r.COMMAND}] Store model`),Y=a(`[${i}:Compositions:${r.COMMAND}] Load proxies`),Vo=a(`[${i}:Compositions:${r.COMMAND}] Compositions listed`),vo=a(`[${i}:Compositions:${r.COMMAND}] Stored compositions list`),Do=a(`[${i}:Compositions:${r.EVENT}] Composition created`),Lo=a(`[${i}:Compositions:${r.EVENT}] Composition closed`);a(`[${i}:Compositions:${r.EVENT}] SVG parsed`);const H=a(`[${i}:Compositions:${r.EVENT}] Model fetched`),Po=a(`[${i}:Compositions:${r.EVENT}] Proxies loaded`),J=a(`[${i}:Compositions:${r.EVENT}] Model stored`),Fo=t=>t.Composer,N=T();N.startListening({actionCreator:Ao,effect:async({payload:t},o)=>{const{dispatch:s}=o,e=[{name:"Camisa polo feminina",svgPath:"catalog/camisa-polo/decorated.svg",descriptionPath:"catalog/camisa-polo/description.md"}];s(v(e)),s(Vo(e))}});N.startListening({actionCreator:v,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(vo(t))}});N.startListening({actionCreator:_,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:n}}=e();s(Do(n.compositions[t.name]))}});N.startListening({actionCreator:Q,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:n}}=e();Object.values(n.compositions).forEach(c=>{c.viewportName===t.name&&s(D({name:c.name,graphId:c.graphId})),c.debugViewport===t.name&&s(W({viewportName:c.name}))})}});N.startListening({actionCreator:D,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(X({graphId:t.graphId})),s(Lo({name:t.name}))}});N.startListening({actionCreator:R,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:n}}=e(),c=Object.values(n.compositions).filter(g=>g.svgPath===t.path);if(!t.content)return;const d=new DOMParser().parseFromString(t.content,"image/svg+xml").getElementsByTagName("modelPath").item(0)?.innerHTML;d&&c.forEach(g=>{g.loading.loadModel==="not-started"&&s(L({compositionName:g.name,modelPath:d}))})}});N.startListening({actionCreator:L,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:n}}=e(),c=n.compositions[t.compositionName],p=await(await(await fetch(t.modelPath)).blob()).text();s(H({compositionName:c.name,model:JSON.parse(p)}))}});N.startListening({actionCreator:H,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:n}}=e(),c=n.compositions[t.compositionName];s(Y({compositionName:c.name,model:t.model})),s(F({compositionName:c.name,model:t.model}))}});N.startListening({actionCreator:Y,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:n},Materials:{materials:c}}=e(),m=n.compositions[t.compositionName],p=t.model.nodes;Object.values(p).forEach(d=>{if(!("proxies"in d))return;const g=p[d.materialId];g||console.warn(`Missing material node ${d.materialId}! parsing material id`);const l=g?.materialId??d.materialId.split("-")[1],u=c[l],M=d.proxies.reduce(($,C)=>({...$,[C.elem]:{...$[C.elem],[C.attr]:u.attributes.cor.hex}}),{});Object.entries(M).forEach(([$,C])=>{s(j({path:m.svgPath,instanceName:m.name,id:$,styles:C}))})}),s(Po({compositionName:m.name,model:t.model}))}});N.startListening({actionCreator:F,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:n}}=e(),c=n.compositions[t.compositionName];s(Z({graphId:c.graphId,graph:t.model})),s(J({compositionName:c.name,model:t.model}))}});N.startListening({actionCreator:V,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:n}}=e();n.compositions[t.compositionName],s(So({compositionName:t.compositionName,viewportName:t.debugViewport}))}});const h=T();h.startListening({actionCreator:k,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:n},Materials:{materials:c,materialTypes:m}}=e(),p=c[t.materialId],d=m[p.type],g=d.schemas[d.latestSchema],l=n.compositions[t.compositionName].graphId,u=`material-${t.materialId}`,M={id:u,type:"MATERIAL",label:p.attributes[g.selector.principal],materialId:t.materialId,position:{x:0,y:0}};s(U({graphId:l,node:M,edges:{inputs:{},outputs:{}}})),s(ho({compositionName:t.compositionName,materialId:t.materialId,nodeId:u}))}});h.startListening({actionCreator:po,effect:async({payload:{compositionName:t,materialUsageId:o,materialId:s}},e)=>{const{dispatch:n,getState:c}=e,m=c(),p=m.Composer.compositionsManager.compositions[t],d=m.Graph.graphs[p.graphId],g=m.Materials.materials[s],l=`material-${s}`;l in d.nodes||n(k({compositionName:p.name,materialId:s}));const M=d.nodes[o],$=Object.values(d.edges).filter(C=>C.sourceId===o&&C.type=="CONSUMES");if("proxies"in M&&M.proxies.length>0&&"cor"in g.attributes){const C=M.proxies.reduce((f,{attr:x,elem:P})=>({...f,[P]:{...f[P],[x]:g.attributes.cor.hex}}),{});Object.entries(C).forEach(([f,x])=>{n(oo({path:p.svgPath,instanceName:p.name,id:f,changes:x}))})}n(E({graphId:p.graphId,nodeId:o,changes:{materialId:l}})),n(so({edge:{id:`${o}->${l}`,sourceId:o,targetId:l,type:"CONSUMES"},graphId:p.graphId})),$.forEach(C=>{n(to({graphId:p.graphId,edgeId:C.id}))}),n($o({compositionName:t,materialUsageId:o,materialId:l}))}});h.startListening({actionCreator:O,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(uo(t))}});h.startListening({actionCreator:eo,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:n}}}=e(),c=Object.values(n).find(m=>m.viewportName===t.viewportName);c&&s(y({compositionName:c.name}))}});h.startListening({actionCreator:y,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(No({compositionName:t.compositionName}))}});h.startListening({actionCreator:lo,effect:async({payload:{compositionName:t,materialId:o,restriction:s}},e)=>{const{dispatch:n,getState:c}=e,{Composer:{compositionsManager:{compositions:m}},Graph:{graphs:p}}=c(),d=m[t],{searchResults:g}=p[d.graphId];n(U({graphId:d.graphId,node:s,edges:{inputs:{[o]:{id:`${o}->${s.id}`,type:"RESTRICTED_BY",attr:s.attribute,sourceId:o,targetId:s.id}},outputs:{}}})),Object.entries(g).filter(([l,u])=>!!l.includes("restriction")).forEach(([l,u])=>n(S({graphId:d.graphId,searchId:l}))),n(Eo({compositionName:t,materialId:o,restrictionId:s.id}))}});h.startListening({actionCreator:Mo,effect:async({payload:{compositionName:t,materialId:o,restrictionId:s,changes:e}},n)=>{const{dispatch:c,getState:m}=n,{Composer:{compositionsManager:{compositions:p}},Graph:{graphs:d}}=m(),g=p[t],{searchResults:l}=d[g.graphId];c(E({graphId:g.graphId,nodeId:s,changes:e})),Object.entries(l).filter(([u,M])=>!!M.findings.find($=>$.id===s)).forEach(([u,M])=>c(S({graphId:g.graphId,searchId:u}))),c(xo({compositionName:t,materialId:o,restrictionId:s}))}});h.startListening({actionCreator:Co,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:n}},Graph:{graphs:c}}=e(),m=n[t.compositionName],{searchResults:p}=c[m.graphId];s(io({graphId:m.graphId,nodeId:t.restrictionId})),Object.entries(p).filter(([d,g])=>!!g.findings.find(l=>l.id===t.restrictionId)).forEach(([d,g])=>s(S({graphId:m.graphId,searchId:d}))),s(yo(t))}});h.startListening({actionCreator:go,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:n}},Graph:{graphs:c}}=e(),m=n[t.compositionName],p=c[m.graphId];if(!m.selectedPart){console.warn("trying to delete proxy without selecting a part");return}const d=p.nodes[t.materialId];if(!("proxies"in d))return;const g=d.proxies.filter(l=>l.elem!==t.proxyId);s(E({graphId:m.graphId,nodeId:t.materialId,changes:{proxies:g}})),s(no({path:m.svgPath,instanceName:m.name,id:t.proxyId})),s(Io(t))}});h.startListening({actionCreator:mo,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:n}},Graph:{graphs:c},Materials:{materials:m}}=e(),p=n[t.compositionName],d=c[p.graphId];if(!p.selectedPart){console.error("trying to delete proxy without selecting a part");return}const g=d.nodes[t.materialId];if(!("proxies"in g)){console.error("trying to add proxy in an node that does not support proxies");return}const l=[...g.proxies,t.proxy],u=Number(g.materialId.split("-")[1]),M=m[u];if(!("cor"in M.attributes)){console.error("material does not have a color attribute ");return}const $=l.filter(C=>C.elem===t.proxy.elem).reduce((C,f)=>({...C,[f.attr]:M.attributes.cor.hex}),{});s(E({graphId:p.graphId,nodeId:t.materialId,changes:{proxies:l}})),s(j({path:p.svgPath,instanceName:p.name,id:t.proxy.elem,styles:$})),s(fo(t))}});h.startListening({actionCreator:b,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(Oo({budgetId:t.budgetId,compositionName:t.compositionName}))}});h.startListening({actionCreator:A,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(bo(t))}});const wo={loading:{loadSVG:"not-started",loadModel:"not-started"},budget:void 0},To={compositionsManager:{compositions:{},compositionsList:[]}},I=G({name:i,initialState:{},reducers:{},extraReducers:t=>{t.addCase(O,(o,{payload:{partName:s}})=>({...o,selectedPart:s})),t.addCase(b,(o,{payload:{budgetId:s,gradesInfo:e}})=>({...o,budget:{budgetId:s,grades:e.reduce((n,c)=>({...n,[c]:0}),{})}})),t.addCase(B,(o,{payload:{gradeId:s}})=>({...o,budget:{...o.budget,grades:{...o.budget?.grades,[s]:0}}})),t.addCase(A,(o,{payload:{gradeId:s,counter:e}})=>({...o,budget:o.budget?{...o.budget,grades:{...o.budget.grades,[s]:e}}:void 0})),t.addCase(y,o=>({...o,selectedPart:void 0})),t.addCase(V,(o,{payload:s})=>({...o,debugViewport:s.debugViewport}))}}),Go=G({name:i,initialState:To,reducers:{},extraReducers:t=>{t.addCase(_,(o,{payload:{name:s,viewportName:e,svgPath:n,graphId:c}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s]:{...wo,name:s,svgPath:n,graphId:c,viewportName:e}}}})).addCase(v,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositionsList:s.payload}})).addCase(D,(o,{payload:{name:s}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:Object.values(o.compositionsManager.compositions).reduce((e,n)=>n.name===s?e:{...e,[n.name]:n},{})}})).addCase(ao,(o,{payload:{path:s}})=>{const e=Object.values(o.compositionsManager.compositions).find(n=>n.svgPath===s);return e?{...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[e.name]:{...e,loading:{...e.loading,loadSVG:"started"}}}}}:o}),t.addCase(R,(o,{payload:{path:s}})=>{const e=Object.values(o.compositionsManager.compositions).find(n=>n.svgPath===s);return e?{...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[e.name]:{...e,loading:{...e.loading,loadSVG:"completed"}}}}}:o}),t.addCase(L,(o,{payload:{compositionName:s}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s]:{...o.compositionsManager.compositions[s],loading:{...o.compositionsManager.compositions[s].loading,loadModel:"started"}}}}})),t.addCase(J,(o,{payload:s})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.compositionName]:{...o.compositionsManager.compositions[s.compositionName],loading:{...o.compositionsManager.compositions[s.compositionName].loading,loadModel:"completed"}}}}})),t.addCase(O,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(y,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(V,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(b,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(B,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(A,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:I.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}}))}});function Ro({managers:{storeManager:t,componentRegistryManager:o,layoutManager:s,ribbonMenuManager:e,viewportManager:n}}){t.functions.loadReducer(i,Go.reducer),t.functions.registerMiddleware(N),t.functions.registerMiddleware(h),o.functions.registerComponents({ribbonMenuSections:{ModelSelector:w.memo(q)},viewportTypes:{Composer:w.memo(z),DebuggerViewport:K}}),e.functions.addNewTab({label:"Compositor",sectionNames:["ModelSelector"],type:"base"})}const Yo={name:i,version:co,depends_on:["Layout","Graph","SVG","Materials","Converter"],components:{},hooks:{useComposition:ro},kernelCalls:{startModule:Ro,restartModule(){},shutdownModule(){}}};export{b as a,B as b,A as c,lo as d,Co as e,_o as f,po as g,mo as h,go as i,Fo as j,_ as k,Ao as l,Yo as m,V as o,O as s,Mo as u};