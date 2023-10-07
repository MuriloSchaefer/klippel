import{b as V,_ as b}from"../../vendor-8069b187.js";import{n as l}from"../../kernel-17e84a6e.js";import{a as $,u as w,d as x,s as D,b as T,c as A,e as G,f as N,g as k,h as _,o as L}from"../Composer-9d2f7be3.js";const F=(i,h)=>{const y=l("Store"),I=l("Layout"),E=l("Graph"),S=l("SVG"),{useAppDispatch:M,useAppSelector:c}=y.hooks,r=M(),f=I.hooks.usePanelsManager(),{useGraph:v}=E.hooks;S.hooks;const p=V(e=>e&&e.Composer.compositionsManager.compositions[i],h),g=c(p),s=c(e=>e&&e.Composer.compositionsManager.compositions[i]),t=v(s?.graphId,e=>({adjacencyList:e?.adjacencyList,nodes:e?.nodes}));return{state:g,actions:{addPart(e,o,n){const a={type:"PART",id:e,label:e,position:{x:0,y:0},domId:o};let u;if(n){const d=`${n}->${e}`;u={inputs:{[d]:{id:d,sourceId:n,targetId:e,type:"COMPOSED_OF"}},outputs:{}}}t.actions.addNode(a,u)},removePart(e){t.actions.removeNode(e)},addMaterialUsage(e,o,n){const a=b.uniqueId("material-usage-"),u={type:"MATERIAL_USAGE",id:a,label:e,editableAttributes:["materialType","materialId"],materialId:"material-12",materialType:n[0]??"malha",position:{x:0,y:0},proxies:[]},d=`${a}-restriction-1`,m=`${o}->${a}`,C={inputs:{[m]:{id:m,sourceId:o,targetId:a,type:"MADE_OF"}},outputs:{}};t.actions.addNode(u,C);const R={type:"RESTRICTION",restrictionType:"allowOnly",attribute:"materialType",id:d,label:"Permitido apenas",operand:n,position:{x:0,y:0}},P=`${a}->${d}`,O={inputs:{[P]:{id:P,sourceId:a,targetId:d,attr:"materialType",type:"RESTRICTED_BY"}},outputs:{}};t.actions.addNode(R,O)},removeMaterialUsage(e){t.actions.removeNode(e)},addRestriction(e,o){r($({compositionName:i,materialId:e,restriction:o}))},updateRestriction(e,o,n){r(w({compositionName:i,materialId:e,restrictionId:o,changes:n}))},removeRestriction(e,o){r(x({compositionName:i,materialId:e,restrictionId:o}))},removeOperation(e){t.actions.removeNode(e)},addOperation(e,o,n,a){const u=b.uniqueId("operation-"),d=`${a}->${u}`,m={id:u,type:"OPERATION",label:e,position:{x:0,y:0},cost:o,time_taken:n},C={inputs:{[d]:{id:d,sourceId:a,targetId:u,type:"PROCESS_NEEDED"}},outputs:{}};t.actions.addNode(m,C)},updateMaterialConsuption:(e,o)=>{t.actions.updateEdge(e,o)},deleteMaterialConsuption:e=>{t.actions.removeEdge(e)},addMaterialConsuption:(e,o,n)=>{const a={id:`${e}->${o}`,sourceId:e,targetId:o,type:"CONSUMES",quantity:n};t.actions.addEdge(a)},selectPart(e){r(D({compositionName:i,partName:e})),f.functions.openDetails()},changeMaterialType(e,o){t.actions.nodeExists(o)||r(T({compositionName:s?.name,materialType:o})),t.actions.updateNode({id:e,materialType:o})},changeMaterial(e,o){r(A({compositionName:s?.name,materialUsageId:e,materialId:o}))},addProxy(e,o){r(G({compositionName:i,materialId:o,proxy:e}))},deleteProxy(e,o){r(N({compositionName:i,materialId:o,proxyId:e}))},updateProxy(){}}}},B=()=>{const i=l("Store"),h=l("Graph"),y=l("Layout"),I=l("SVG"),{useAppDispatch:E,useAppSelector:S}=i.hooks,M=E(),c=y.hooks.useViewportManager(),r=I.hooks.useSVGManager(),f=h.managers.graphs(),{compositionsManager:v}=S(k);return{functions:{createComposition(p,g){const s=c.functions.addViewport(p,"Composer",void 0,"composition-"),t=`catalog/${g}`;f.functions.createGraph(s),M(_({name:s,viewportName:s,svgPath:t,graphId:s})),r.functions.loadSVG(t,s)},createDebugView(p,g){const s=`debug-${p}`;c.functions.createGroup(s,"blue"),c.functions.addToGroup(g,s);const t=c.functions.addViewport("Modelo","DebuggerViewport",s,"debug-");M(L({compositionName:p,debugViewport:t})),c.functions.selectViewport(t)},findComposition(p){return Object.values(v.compositions).find(p)}}}};export{B as a,F as u};
