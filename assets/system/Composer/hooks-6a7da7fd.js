import{b as O,_ as P,r as V}from"../../vendor-4a2caf03.js";import{n as c}from"../../kernel-7bfe83e7.js";import{a as w,u as A,d as D,s as T,b as $,c as G,e as N,f as k,g as L,l as _,h as U,o as j}from"../Composer-0a2df823.js";const z=(n,g)=>{const m=c("Store"),M=c("Layout"),h=c("Graph"),f=c("SVG"),{useAppDispatch:y,useAppSelector:p}=m.hooks,r=y(),E=M.hooks.usePanelsManager(),{useGraph:S}=h.hooks;f.hooks;const u=O(o=>o&&o.Composer.compositionsManager.compositions[n],g),I=p(u),s=p(o=>o&&o.Composer.compositionsManager.compositions[n]),t=S(s?.graphId,o=>({adjacencyList:o?.adjacencyList,nodes:o?.nodes}));return{state:I,actions:{addPart(o,e,i){const a={type:"PART",id:o,label:o,position:{x:0,y:0},domId:e};let l;if(i){const d=`${i}->${o}`;l={inputs:{[d]:{id:d,sourceId:i,targetId:o,type:"COMPOSED_OF"}},outputs:{}}}t.actions.addNode(a,l)},removePart(o){t.actions.removeNode(o)},addMaterialUsage(o,e,i){const a=P.uniqueId("material-usage-"),l={type:"MATERIAL_USAGE",id:a,label:o,editableAttributes:["materialType","materialId"],materialId:"material-12",materialType:i[0]??"malha",position:{x:0,y:0},proxies:[]},d=`${a}-restriction-1`,C=`${e}->${a}`,v={inputs:{[C]:{id:C,sourceId:e,targetId:a,type:"MADE_OF"}},outputs:{}};t.actions.addNode(l,v);const R={type:"RESTRICTION",restrictionType:"allowOnly",attribute:"materialType",id:d,label:"Permitido apenas",operand:i,position:{x:0,y:0}},b=`${a}->${d}`,x={inputs:{[b]:{id:b,sourceId:a,targetId:d,attr:"materialType",type:"RESTRICTED_BY"}},outputs:{}};t.actions.addNode(R,x)},removeMaterialUsage(o){t.actions.removeNode(o)},addRestriction(o,e){r(w({compositionName:n,materialId:o,restriction:e}))},updateRestriction(o,e,i){r(A({compositionName:n,materialId:o,restrictionId:e,changes:i}))},removeRestriction(o,e){r(D({compositionName:n,materialId:o,restrictionId:e}))},removeOperation(o){t.actions.removeNode(o)},addOperation(o,e,i,a){const l=P.uniqueId("operation-"),d=`${a}->${l}`,C={id:l,type:"OPERATION",label:o,position:{x:0,y:0},cost:e,time_taken:i},v={inputs:{[d]:{id:d,sourceId:a,targetId:l,type:"PROCESS_NEEDED"}},outputs:{}};t.actions.addNode(C,v)},updateMaterialConsuption:(o,e)=>{t.actions.updateEdge(o,e)},deleteMaterialConsuption:o=>{t.actions.removeEdge(o)},addMaterialConsuption:(o,e,i)=>{const a={id:`${o}->${e}`,sourceId:o,targetId:e,type:"CONSUMES",quantity:i};t.actions.addEdge(a)},selectPart(o){r(T({compositionName:n,partName:o})),E.functions.openDetails()},changeMaterialType(o,e){t.actions.nodeExists(e)||r($({compositionName:s?.name,materialType:e})),t.actions.updateNode({id:o,materialType:e})},changeMaterial(o,e){r(G({compositionName:s?.name,materialUsageId:o,materialId:e}))},addProxy(o,e){r(N({compositionName:n,materialId:e,proxy:o}))},deleteProxy(o,e){r(k({compositionName:n,materialId:e,proxyId:o}))},updateProxy(){}}}},q=()=>{const n=c("Store"),g=c("Graph"),m=c("Layout"),M=c("SVG"),{useAppDispatch:h,useAppSelector:f}=n.hooks,y=h(),p=m.hooks.useViewportManager(),r=M.hooks.useSVGManager(),E=g.managers.graphs(),{compositionsManager:S}=f(L);return{functions:{listCompositions(){y(_())},createComposition(u,I){const s=p.functions.addViewport(u,"Composer",void 0,"composition-"),t=I;E.functions.createGraph(s),y(U({name:s,viewportName:s,svgPath:t,graphId:s})),r.functions.loadSVG(t,s)},createDebugView(u,I){const s=`debug-${u}`;p.functions.createGroup(s,"blue"),p.functions.addToGroup(I,s);const t=p.functions.addViewport("Modelo","DebuggerViewport",s,"debug-");y(j({compositionName:u,debugViewport:t})),p.functions.selectViewport(t)},findComposition(u){return Object.values(S.compositions).find(u)}}}},H=()=>{const n=c("Store"),{useAppSelector:g}=n.hooks,m=q(),M=g(h=>h.Composer.compositionsManager.compositionsList);return V.useLayoutEffect(()=>{m.functions.listCompositions()},[]),M};export{q as a,H as b,z as u};