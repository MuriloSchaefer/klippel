import{c as n,e as A,d as D,R as w}from"../vendor-8eb1de95.js";import{M as Y,C as H,D as J}from"./Composer/components-f2b032ee.js";import{A as c,c as q,r as z,d as K,S as T,a as R,l as Q,b as G,u as W,e as v,f as X,g as Z,h as oo,i as x,j as so,k as to,m as eo}from"../kernel-a935b9dd.js";const i="Composer",ao="0.0.1",j=n(`[${i}:Compositions:${c.COMMAND}] Add material`),To=n(`[${i}:Compositions:${c.COMMAND}] Add material type`),io=n(`[${i}:Compositions:${c.COMMAND}] Change material`),S=n(`[${i}:Compositions:${c.COMMAND}] Select part`),I=n(`[${i}:Compositions:${c.COMMAND}] Unselect part`),no=n(`[${i}:Compositions:${c.COMMAND}] Add Proxy`),co=n(`[${i}:Compositions:${c.COMMAND}] Delete Proxy`);n(`[${i}:Compositions:${c.COMMAND}] Update Proxy`);const ro=n(`[${i}:Compositions:${c.COMMAND}] Add Restriction`),mo=n(`[${i}:Compositions:${c.COMMAND}] Delete Restriction`),po=n(`[${i}:Compositions:${c.COMMAND}] Update Restriction`),y=n(`[${i}:Compositions:${c.COMMAND}] Open debug viewport`);n(`[${i}:Compositions:${c.COMMAND}] Create debug viewport`);const go=n(`[${i}:Compositions:${c.EVENT}] Material added`);n(`[${i}:Compositions:${c.EVENT}] Material type added`);const lo=n(`[${i}:Compositions:${c.EVENT}] Part selected`),Co=n(`[${i}:Compositions:${c.EVENT}] Part unselected`),ho=n(`[${i}:Compositions:${c.EVENT}] Material changed`),Mo=n(`[${i}:Compositions:${c.EVENT}] Proxy added`),uo=n(`[${i}:Compositions:${c.EVENT}] Proxy deleted`);n(`[${i}:Compositions:${c.EVENT}] Proxy updated`);const fo=n(`[${i}:Compositions:${c.EVENT}] Restriction added`),No=n(`[${i}:Compositions:${c.EVENT}] Restriction deleted`),$o=n(`[${i}:Compositions:${c.EVENT}] Restriction updated`),vo=n(`[${i}:Compositions:${c.EVENT}] Debug viewport opened`);n(`[${i}:Compositions:${c.EVENT}] Debug viewport closed`);const Io=n(`[${i}:Compositions:${c.COMMAND}] List compositions`),O=n(`[${i}:Compositions:${c.COMMAND}] Store compositions list`),U=n(`[${i}:Compositions:${c.COMMAND}] Create composition`),b=n(`[${i}:Compositions:${c.COMMAND}] Close composition`);n(`[${i}:Compositions:${c.COMMAND}] Parse SVG`);const L=n(`[${i}:Compositions:${c.COMMAND}] Fetch model `),_=n(`[${i}:Compositions:${c.COMMAND}] Store model`),k=n(`[${i}:Compositions:${c.COMMAND}] Load proxies`),Eo=n(`[${i}:Compositions:${c.COMMAND}] Compositions listed`),Po=n(`[${i}:Compositions:${c.COMMAND}] Stored compositions list`),xo=n(`[${i}:Compositions:${c.EVENT}] Composition created`),So=n(`[${i}:Compositions:${c.EVENT}] Composition closed`);n(`[${i}:Compositions:${c.EVENT}] SVG parsed`);const F=n(`[${i}:Compositions:${c.EVENT}] Model fetched`),yo=n(`[${i}:Compositions:${c.EVENT}] Proxies loaded`),B=n(`[${i}:Compositions:${c.EVENT}] Model stored`),Ro=t=>t.Composer,M=A();M.startListening({actionCreator:Io,effect:async({payload:t},o)=>{const{dispatch:s}=o,e=[{name:"Camisa polo feminina",svgPath:"catalog/camisa-polo/decorated.svg",descriptionPath:"catalog/camisa-polo/description.md"},{name:"Camisa polo masculina",svgPath:"catalog/camisa-polo/decorated.svg",descriptionPath:"catalog/camisa-polo/description.md"},{name:"Camiseta baby look",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camiseta gola v",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camisa social",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camisete social",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camiseta gola v",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camisa social",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camisete social",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camiseta gola v",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camisa social",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camisete social",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camiseta gola v",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camisa social",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camisete social",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camiseta gola v",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camisa social",svgPath:"catalog/camisa-polo/decorated.svg"},{name:"Camisete social",svgPath:"catalog/camisa-polo/decorated.svg"}];s(O(e)),s(Eo(e))}});M.startListening({actionCreator:O,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(Po(t))}});M.startListening({actionCreator:U,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:a}}=e();s(xo(a.compositions[t.name]))}});M.startListening({actionCreator:q,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:a}}=e();Object.values(a.compositions).forEach(r=>{r.viewportName===t.name&&s(b({name:r.name,graphId:r.graphId})),r.debugViewport===t.name&&s(z({viewportName:r.name}))})}});M.startListening({actionCreator:b,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(K({graphId:t.graphId})),s(So({name:t.name}))}});M.startListening({actionCreator:T,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:a}}=e(),r=Object.values(a.compositions).filter(g=>g.svgPath===t.path);if(!t.content)return;const d=new DOMParser().parseFromString(t.content,"image/svg+xml").getElementsByTagName("modelPath").item(0)?.innerHTML;d&&r.forEach(g=>{g.loading.loadModel==="not-started"&&s(L({compositionName:g.name,modelPath:d}))})}});M.startListening({actionCreator:L,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:a}}=e(),r=a.compositions[t.compositionName],m=await(await(await fetch(t.modelPath)).blob()).text();s(F({compositionName:r.name,model:JSON.parse(m)}))}});M.startListening({actionCreator:F,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:a}}=e(),r=a.compositions[t.compositionName];s(k({compositionName:r.name,model:t.model})),s(_({compositionName:r.name,model:t.model}))}});M.startListening({actionCreator:k,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:a},Materials:{materials:r}}=e(),p=a.compositions[t.compositionName],m=t.model.nodes;Object.values(m).forEach(d=>{if(!("proxies"in d))return;const g=m[d.materialId].materialId,l=r[g],h=d.proxies.reduce((C,u)=>({...C,[u.elem]:{...C[u.elem],[u.attr]:l.attributes.cor.hex}}),{});Object.entries(h).forEach(([C,u])=>{s(R({path:p.svgPath,instanceName:p.name,id:C,styles:u}))})}),s(yo({compositionName:p.name,model:t.model}))}});M.startListening({actionCreator:_,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:a}}=e(),r=a.compositions[t.compositionName];s(Q({graphId:r.graphId,graph:t.model})),s(B({compositionName:r.name,model:t.model}))}});M.startListening({actionCreator:y,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:a}}=e();a.compositions[t.compositionName],s(vo({compositionName:t.compositionName,viewportName:t.debugViewport}))}});const f=A();f.startListening({actionCreator:j,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:a},Materials:{materials:r,materialTypes:p}}=e(),m=r[t.materialId],d=p[m.type],g=d.schemas[d.latestSchema],l=a.compositions[t.compositionName].graphId,h=`material-${t.materialId}`,C={id:h,type:"MATERIAL",label:m.attributes[g.selector.principal],materialId:t.materialId,position:{x:0,y:0}};s(G({graphId:l,node:C,edges:{inputs:{},outputs:{}}})),s(go({compositionName:t.compositionName,materialId:t.materialId,nodeId:h}))}});f.startListening({actionCreator:io,effect:async({payload:{compositionName:t,materialUsageId:o,materialId:s}},e)=>{const{dispatch:a,getState:r}=e,p=r(),m=p.Composer.compositionsManager.compositions[t],d=p.Graph.graphs[m.graphId],g=p.Materials.materials[s],l=`material-${s}`;l in d.nodes||a(j({compositionName:m.name,materialId:s}));const C=d.nodes[o],u=Object.values(d.edges).filter(N=>N.sourceId===o&&N.type=="CONSUMES");if("proxies"in C&&C.proxies.length>0&&"cor"in g.attributes){const N=C.proxies.reduce(($,{attr:E,elem:V})=>({...$,[V]:{...$[V],[E]:g.attributes.cor.hex}}),{});Object.entries(N).forEach(([$,E])=>{a(W({path:m.svgPath,instanceName:m.name,id:$,changes:E}))})}a(v({graphId:m.graphId,nodeId:o,changes:{materialId:l}})),a(X({edge:{id:`${o}->${l}`,sourceId:o,targetId:l,type:"CONSUMES"},graphId:m.graphId})),u.forEach(N=>{a(Z({graphId:m.graphId,edgeId:N.id}))}),a(ho({compositionName:t,materialUsageId:o,materialId:l}))}});f.startListening({actionCreator:S,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(lo(t))}});f.startListening({actionCreator:oo,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:a}}}=e(),r=Object.values(a).find(p=>p.viewportName===t.viewportName);r&&s(I({compositionName:r.name}))}});f.startListening({actionCreator:I,effect:async({payload:t},o)=>{const{dispatch:s}=o;s(Co({compositionName:t.compositionName}))}});f.startListening({actionCreator:ro,effect:async({payload:{compositionName:t,materialId:o,restriction:s}},e)=>{const{dispatch:a,getState:r}=e,{Composer:{compositionsManager:{compositions:p}},Graph:{graphs:m}}=r(),d=p[t],{searchResults:g}=m[d.graphId];a(G({graphId:d.graphId,node:s,edges:{inputs:{[o]:{id:`${o}->${s.id}`,type:"RESTRICTED_BY",attr:s.attribute,sourceId:o,targetId:s.id}},outputs:{}}})),Object.entries(g).filter(([l,h])=>!!l.includes("restriction")).forEach(([l,h])=>a(x({graphId:d.graphId,searchId:l}))),a(fo({compositionName:t,materialId:o,restrictionId:s.id}))}});f.startListening({actionCreator:po,effect:async({payload:{compositionName:t,materialId:o,restrictionId:s,changes:e}},a)=>{const{dispatch:r,getState:p}=a,{Composer:{compositionsManager:{compositions:m}},Graph:{graphs:d}}=p(),g=m[t],{searchResults:l}=d[g.graphId];r(v({graphId:g.graphId,nodeId:s,changes:e})),Object.entries(l).filter(([h,C])=>!!C.findings.find(u=>u.id===s)).forEach(([h,C])=>r(x({graphId:g.graphId,searchId:h}))),r($o({compositionName:t,materialId:o,restrictionId:s}))}});f.startListening({actionCreator:mo,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:a}},Graph:{graphs:r}}=e(),p=a[t.compositionName],{searchResults:m}=r[p.graphId];s(so({graphId:p.graphId,nodeId:t.restrictionId})),Object.entries(m).filter(([d,g])=>!!g.findings.find(l=>l.id===t.restrictionId)).forEach(([d,g])=>s(x({graphId:p.graphId,searchId:d}))),s(No(t))}});f.startListening({actionCreator:co,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:a}},Graph:{graphs:r}}=e(),p=a[t.compositionName],m=r[p.graphId];if(!p.selectedPart){console.warn("trying to delete proxy without selecting a part");return}const d=m.nodes[t.materialId];if(!("proxies"in d))return;const g=d.proxies.filter(l=>l.elem!==t.proxyId);s(v({graphId:p.graphId,nodeId:t.materialId,changes:{proxies:g}})),s(to({path:p.svgPath,instanceName:p.name,id:t.proxyId})),s(uo(t))}});f.startListening({actionCreator:no,effect:async({payload:t},o)=>{const{dispatch:s,getState:e}=o,{Composer:{compositionsManager:{compositions:a}},Graph:{graphs:r},Materials:{materials:p}}=e(),m=a[t.compositionName],d=r[m.graphId];if(!m.selectedPart){console.error("trying to delete proxy without selecting a part");return}const g=d.nodes[t.materialId];if(!("proxies"in g)){console.error("trying to add proxy in an node that does not support proxies");return}const l=[...g.proxies,t.proxy],h=Number(g.materialId.split("-")[1]),C=p[h];if(!("cor"in C.attributes)){console.error("material does not have a color attribute ");return}const u=l.filter(N=>N.elem===t.proxy.elem).reduce((N,$)=>({...N,[$.attr]:C.attributes.cor.hex}),{});s(v({graphId:m.graphId,nodeId:t.materialId,changes:{proxies:l}})),s(R({path:m.svgPath,instanceName:m.name,id:t.proxy.elem,styles:u})),s(Mo(t))}});const Oo={loading:{loadSVG:"not-started",loadModel:"not-started"}},bo={compositionsManager:{compositions:{},compositionsList:[]}},P=D({name:i,initialState:{},reducers:{},extraReducers:t=>{t.addCase(S,(o,{payload:{partName:s}})=>({...o,selectedPart:s})),t.addCase(I,o=>({...o,selectedPart:void 0})),t.addCase(y,(o,{payload:s})=>({...o,debugViewport:s.debugViewport}))}}),Lo=D({name:i,initialState:bo,reducers:{},extraReducers:t=>{t.addCase(U,(o,{payload:{name:s,viewportName:e,svgPath:a,graphId:r}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s]:{...Oo,name:s,svgPath:a,graphId:r,viewportName:e}}}})).addCase(O,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositionsList:s.payload}})).addCase(b,(o,{payload:{name:s}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:Object.values(o.compositionsManager.compositions).reduce((e,a)=>a.name===s?e:{...e,[a.name]:a},{})}})).addCase(eo,(o,{payload:{path:s}})=>{const e=Object.values(o.compositionsManager.compositions).find(a=>a.svgPath===s);return e?{...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[e.name]:{...e,loading:{...e.loading,loadSVG:"started"}}}}}:o}),t.addCase(T,(o,{payload:{path:s}})=>{const e=Object.values(o.compositionsManager.compositions).find(a=>a.svgPath===s);return e?{...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[e.name]:{...e,loading:{...e.loading,loadSVG:"completed"}}}}}:o}),t.addCase(L,(o,{payload:{compositionName:s}})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s]:{...o.compositionsManager.compositions[s],loading:{...o.compositionsManager.compositions[s].loading,loadModel:"started"}}}}})),t.addCase(B,(o,{payload:s})=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.compositionName]:{...o.compositionsManager.compositions[s.compositionName],loading:{...o.compositionsManager.compositions[s.compositionName].loading,loadModel:"completed"}}}}})),t.addCase(S,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:P.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(I,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:P.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}})),t.addCase(y,(o,s)=>({...o,compositionsManager:{...o.compositionsManager,compositions:{...o.compositionsManager.compositions,[s.payload.compositionName]:P.reducer(o.compositionsManager.compositions[s.payload.compositionName],s)}}}))}});function Vo({managers:{storeManager:t,componentRegistryManager:o,layoutManager:s,ribbonMenuManager:e,viewportManager:a}}){t.functions.loadReducer(i,Lo.reducer),t.functions.registerMiddleware(M),t.functions.registerMiddleware(f),o.functions.registerComponents({ribbonMenuSections:{ModelSelector:w.memo(Y)},viewportTypes:{Composer:w.memo(H),DebuggerViewport:J}}),e.functions.addNewTab({label:"Compositor",sectionNames:["ModelSelector"],type:"base"})}const Go={name:i,version:ao,depends_on:["Layout","Graph","SVG","Materials","Converter"],components:{},kernelCalls:{startModule:Vo,restartModule(){},shutdownModule(){}}};export{ro as a,To as b,io as c,mo as d,no as e,co as f,Ro as g,U as h,Io as l,Go as m,y as o,S as s,po as u};