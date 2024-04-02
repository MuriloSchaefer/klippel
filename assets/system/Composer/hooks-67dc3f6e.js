import{b as $,_ as R,r as w}from"../../vendor-8eb1de95.js";import{n as u}from"../../kernel-a935b9dd.js";import{a as x,u as T,d as V,s as L,b as _,c as j,e as k,f as U,g as q,l as H,h as F,o as Y}from"../Composer-6078c022.js";const Q=(r,m)=>{const M=u("Store"),h=u("Layout"),E=u("Graph"),S=u("Materials"),{useAppDispatch:y,useAppSelector:g}=M.hooks,c=y(),C=h.hooks.usePanelsManager(),{useGraph:b}=E.hooks,{useMaterials:l}=S.hooks,f=$(e=>e&&e.Composer.compositionsManager.compositions[r],m),n=g(f),p=g(e=>e&&e.Composer.compositionsManager.compositions[r]),s=b(p?.graphId,e=>({adjacencyList:e?.adjacencyList,nodes:e?.nodes,edges:e?.edges})),G=l();return{state:n,actions:{changeProperties(e,o){const t=s.state?.nodes?.garment;if(!t)throw Error("root node not found");const a={...t,label:e,description:o};s.actions.updateNode(a)},addGrade(e,o){const t=R.uniqueId(`${e}-grade-`),a={type:"GRADE",id:t,abbreviation:e,position:{x:0,y:0}};s.actions.addNode(a);const d={type:"HAS_GRADE",id:`garment -> ${t}`,sourceId:"garment",targetId:t,order:o};s.actions.addEdge(d)},reorderGrade(e,o){s.actions.updateEdge(`garment -> ${e}`,{order:o}),Object.values(s.state?.edges??{}).filter(t=>t.type==="HAS_GRADE"&&t.order>=o).sort((t,a)=>t.order-a.order).forEach(t=>s.actions.updateEdge(t.id,{order:t.order+1}))},removeGrade(e){if(!s.state?.edges||!s.state.adjacencyList)throw Error("edges not defined");const t=s.state.adjacencyList[e].inputs.at(0);if(!t)throw Error("edges not found");const{order:a}=s.state.edges[t];s.actions.removeNode(e),Object.values(s.state?.edges??{}).filter(d=>d.type==="HAS_GRADE"&&d.order>a).sort((d,i)=>d.order-i.order).forEach(d=>s.actions.updateEdge(d.id,{order:d.order-1}))},addPart(e,o,t){const a={type:"PART",id:e,label:e,position:{x:0,y:0},domId:o};let d;if(t){const i=`${t}->${e}`;d={inputs:{[i]:{id:i,sourceId:t,targetId:e,type:"COMPOSED_OF"}},outputs:{}}}s.actions.addNode(a,d)},removePart(e){s.actions.removeNode(e)},addMaterialUsage(e,o,t){t.forEach(A=>{Object.values(s.state?.nodes??{}).find(O=>O.id===A)||(console.log("adding type node"),s.actions.addNode({id:A,type:"MATERIAL_TYPE",label:G[A].label}))});const a=R.uniqueId("material-usage-"),d={type:"MATERIAL_USAGE",id:a,label:e,editableAttributes:["materialType","materialId"],materialId:"material-12",materialType:t[0]??"malha",position:{x:0,y:0},proxies:[]},i=`${a}-restriction-1`,I=`${o}->${a}`,v={inputs:{[I]:{id:I,sourceId:o,targetId:a,type:"MADE_OF"}},outputs:{}};s.actions.addNode(d,v);const D={type:"RESTRICTION",restrictionType:"allowOnly",attribute:"materialType",id:i,label:"Permitido apenas",operand:t,position:{x:0,y:0}},P=`${a}->${i}`,N={inputs:{[P]:{id:P,sourceId:a,targetId:i,attr:"materialType",type:"RESTRICTED_BY"}},outputs:{}};s.actions.addNode(D,N)},removeMaterialUsage(e){s.actions.removeNode(e)},addRestriction(e,o){c(x({compositionName:r,materialId:e,restriction:o}))},updateRestriction(e,o,t){c(T({compositionName:r,materialId:e,restrictionId:o,changes:t}))},removeRestriction(e,o){c(V({compositionName:r,materialId:e,restrictionId:o}))},removeOperation(e){s.actions.removeNode(e)},addOperation(e,o,t,a){const d=R.uniqueId("operation-"),i=`${a}->${d}`,I={id:d,type:"OPERATION",label:e,position:{x:0,y:0},cost:o,time_taken:t},v={inputs:{[i]:{id:i,sourceId:a,targetId:d,type:"PROCESS_NEEDED"}},outputs:{}};s.actions.addNode(I,v)},updateMaterialConsuption:(e,o)=>{s.actions.updateEdge(e,o)},deleteMaterialConsuption:e=>{s.actions.removeEdge(e)},addMaterialConsuption:(e,o,t)=>{const a={id:`${e}->${o}`,sourceId:e,targetId:o,type:"CONSUMES",quantity:t};s.actions.addEdge(a)},selectPart(e){c(L({compositionName:r,partName:e})),C.functions.openDetails()},changeMaterialType(e,o){s.actions.nodeExists(o)||c(_({compositionName:p?.name,materialType:o})),s.actions.updateNode({id:e,materialType:o})},changeMaterial(e,o){c(j({compositionName:p?.name,materialUsageId:e,materialId:o}))},addProxy(e,o){c(k({compositionName:r,materialId:o,proxy:e}))},deleteProxy(e,o){c(U({compositionName:r,materialId:o,proxyId:e}))},updateProxy(){}}}},B=()=>{const r=u("Store"),m=u("Graph"),M=u("Layout"),h=u("SVG"),{useAppDispatch:E,useAppSelector:S}=r.hooks,y=E(),g=M.hooks.useViewportManager(),c=h.hooks.useSVGManager(),C=m.managers.graphs(),{compositionsManager:b}=S(q);return{functions:{listCompositions(){y(H())},createComposition(l,f){const n=g.functions.addViewport(l,"Composer",void 0,"composition-"),p=f;C.functions.createGraph(n),y(F({name:n,viewportName:n,svgPath:p,graphId:n})),c.functions.loadSVG(p,n)},createDebugView(l,f){const n=`debug-${l}`;g.functions.createGroup(n,"blue"),g.functions.addToGroup(f,n);const p=g.functions.addViewport("Modelo","DebuggerViewport",n,"debug-");y(Y({compositionName:l,debugViewport:p})),g.functions.selectViewport(p)},findComposition(l){return Object.values(b.compositions).find(l)}}}},W=()=>{const r=u("Store"),{useAppSelector:m}=r.hooks,M=B(),h=m(E=>E.Composer.compositionsManager.compositionsList);return w.useLayoutEffect(()=>{M.functions.listCompositions()},[]),h};export{B as a,W as b,Q as u};