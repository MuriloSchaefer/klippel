import{b as T,_ as G,r as $}from"../../vendor-14321f5b.js";import{n as u}from"../../kernel-33bc2b3c.js";import{a as x,b as j,c as V,d as L,u as _,e as k,s as U,f as B,g as q,h as H,i as F,j as Y,l as z,k as J,o as K}from"../Composer-9d19926f.js";const ee=(l,f)=>{const g=u("Store"),M=u("Layout"),h=u("Graph"),N=u("Materials"),{useAppDispatch:I,useAppSelector:m}=g.hooks,n=I(),b=M.hooks.usePanelsManager(),{useGraph:v}=h.hooks,{useMaterialTypes:C}=N.hooks,p=e=>{if(!e)return;const{compositionName:o,viewportName:t}=l;if(o)return e.Composer.compositionsManager.compositions[o];if(t)return Object.values(e.Composer.compositionsManager.compositions).find(a=>a.viewportName===t);console.warn("either compositionName or viewportName shall be provided")},y=T(p,f),r=m(y),i=m(p),s=v(i?.graphId,e=>({adjacencyList:e?.adjacencyList,nodes:e?.nodes,edges:e?.edges})),P=C();return{state:r,actions:{changeProperties(e,o){const t=s.state?.nodes?.garment;if(!t)throw Error("root node not found");const a={...t,label:e,description:o};s.actions.updateNode(a)},addToBudget(e,o){const t=Object.values(s.state?.nodes??{}).filter(a=>a.type==="GRADE").map(a=>a.id);n(x({compositionName:e,budgetId:o,gradesInfo:t}))},addGrade(e,o){const t=G.uniqueId(`${e}-grade-`),a={type:"GRADE",id:t,abbreviation:e,position:{x:0,y:0}};s.actions.addNode(a);const d={type:"HAS_GRADE",id:`garment -> ${t}`,sourceId:"garment",targetId:t,order:o};s.actions.addEdge(d),n(j({compositionName:i?.name,budgetId:i?.budget?.budgetId,gradeId:t}))},reorderGrade(e,o){s.actions.updateEdge(`garment -> ${e}`,{order:o}),Object.values(s.state?.edges??{}).filter(t=>t.type==="HAS_GRADE"&&t.order>=o).sort((t,a)=>t.order-a.order).forEach(t=>s.actions.updateEdge(t.id,{order:t.order+1}))},removeGrade(e){if(!s.state?.edges||!s.state.adjacencyList)throw Error("edges not defined");const t=s.state.adjacencyList[e].inputs.at(0);if(!t)throw Error("edges not found");const{order:a}=s.state.edges[t];s.actions.removeNode(e),Object.values(s.state?.edges??{}).filter(d=>d.type==="HAS_GRADE"&&d.order>a).sort((d,c)=>d.order-c.order).forEach(d=>s.actions.updateEdge(d.id,{order:d.order-1}))},changeGradeCounter(e,o){n(V({compositionName:i?.name,gradeId:e,counter:o}))},addPart(e,o,t){const a={type:"PART",id:e,label:e,position:{x:0,y:0},domId:o};let d;if(t){const c=`${t}->${e}`;d={inputs:{[c]:{id:c,sourceId:t,targetId:e,type:"COMPOSED_OF"}},outputs:{}}}s.actions.addNode(a,d)},removePart(e){s.actions.removeNode(e)},addMaterialUsage(e,o,t){t.forEach(A=>{Object.values(s.state?.nodes??{}).find(O=>O.id===A)||(console.log("adding type node"),s.actions.addNode({id:A,type:"MATERIAL_TYPE",label:P[A].label}))});const a=G.uniqueId("material-usage-"),d={type:"MATERIAL_USAGE",id:a,label:e,editableAttributes:["materialType","materialId"],materialId:"material-12",materialType:t[0]??"malha",position:{x:0,y:0},proxies:[]},c=`${a}-restriction-1`,E=`${o}->${a}`,S={inputs:{[E]:{id:E,sourceId:o,targetId:a,type:"MADE_OF"}},outputs:{}};s.actions.addNode(d,S);const w={type:"RESTRICTION",restrictionType:"allowOnly",attribute:"materialType",id:c,label:"Permitido apenas",operand:t,position:{x:0,y:0}},R=`${a}->${c}`,D={inputs:{[R]:{id:R,sourceId:a,targetId:c,attr:"materialType",type:"RESTRICTED_BY"}},outputs:{}};s.actions.addNode(w,D)},removeMaterialUsage(e){s.actions.removeNode(e)},addRestriction(e,o){n(L({compositionName:i.name,materialId:e,restriction:o}))},updateRestriction(e,o,t){n(_({compositionName:i.name,materialId:e,restrictionId:o,changes:t}))},removeRestriction(e,o){n(k({compositionName:i.name,materialId:e,restrictionId:o}))},removeOperation(e){s.actions.removeNode(e)},addOperation(e,o,t,a){const d=G.uniqueId("operation-"),c=`${a}->${d}`,E={id:d,type:"OPERATION",label:e,position:{x:0,y:0},cost:o,time_taken:t},S={inputs:{[c]:{id:c,sourceId:a,targetId:d,type:"PROCESS_NEEDED"}},outputs:{}};s.actions.addNode(E,S)},updateMaterialConsuption:(e,o)=>{s.actions.updateEdge(e,o)},deleteMaterialConsuption:e=>{s.actions.removeEdge(e)},addMaterialConsuption:(e,o,t)=>{const a={id:`${e}->${o}`,sourceId:e,targetId:o,type:"CONSUMES",quantity:t};s.actions.addEdge(a)},selectPart(e){n(U({compositionName:i.name,partName:e})),b.functions.openDetails()},changeMaterialType(e,o){s.actions.nodeExists(o)||n(B({compositionName:i?.name,materialType:o})),s.actions.updateNode({id:e,materialType:o})},changeMaterial(e,o){n(q({compositionName:i?.name,materialUsageId:e,materialId:o}))},addProxy(e,o){n(H({compositionName:i.name,materialId:o,proxy:e}))},deleteProxy(e,o){n(F({compositionName:i.name,materialId:o,proxyId:e}))},updateProxy(){}}}},Q=()=>{const l=u("Store"),f=u("Graph"),g=u("Layout"),M=u("SVG"),{useAppDispatch:h,useAppSelector:N}=l.hooks,I=g.hooks.usePanelsManager(),m=h(),n=g.hooks.useViewportManager(),b=M.hooks.useSVGManager(),v=f.managers.graphs(),{compositionsManager:C}=N(Y);return{functions:{listCompositions(){m(z())},createComposition(p,y){const r=n.functions.addViewport(p,"Composer",void 0,"composition-");n.functions.selectViewport(r),I.functions.openDetails();const i=y;v.functions.createGraph(r),m(J({name:r,viewportName:r,svgPath:i,graphId:r})),b.functions.loadSVG(i,r)},createDebugView(p,y){const r=`debug-${p}`;n.functions.createGroup(r,"blue"),n.functions.addToGroup(y,r);const i=n.functions.addViewport("Modelo","DebuggerViewport",r,"debug-");m(K({compositionName:p,debugViewport:i})),n.functions.selectViewport(i)},findComposition(p){return Object.values(C.compositions).find(p)}}}},oe=()=>{const l=u("Store"),{useAppSelector:f}=l.hooks,g=Q(),M=f(h=>h.Composer.compositionsManager.compositionsList);return $.useLayoutEffect(()=>{g.functions.listCompositions()},[]),M};export{Q as a,oe as b,ee as u};
