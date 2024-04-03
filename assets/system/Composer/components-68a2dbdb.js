import{r as f,o as e,B as g,aF as I,aG as K,I as M,aH as X,$ as E,aI as q,H as ee,aJ as te,aK as V,aL as ne,R,aM as oe,aN as se,aO as ae,aP as re,S as F,aQ as ie,aR as le,aS as z,aT as ce,aU as A,aV as L,T as w,aW as W,Z as O,_ as P,a3 as N,aX as de,aY as ue,aZ as $,P as D,a_ as pe,a$ as _,a2 as U,b0 as me,b1 as xe,b2 as he,y as fe,ay as je,b3 as ge,b4 as ve,b5 as be,b6 as ye,b7 as Ce,b8 as T,b9 as Me,aj as we,ba as Pe}from"../../vendor-14971a7b.js";import{n as u}from"../../kernel-47e54a14.js";import{u as y,a as B,b as ke}from"./hooks-66731c2f.js";const Ge=({compositionName:t})=>{const n=u("Pointer"),{PointerContainer:a,ConfirmAndCloseButton:d}=n.components,l=y({compositionName:t},o=>o?.selectedPart),[c,i]=f.useState({name:"",domId:""}),r=f.useCallback(()=>{l.actions.addPart(c.name,c.domId,l.state)},[c]);return e.jsx(a,{component:e.jsxs(g,{sx:{width:200},children:[e.jsx(I,{id:"part-name",label:"Nome",variant:"standard",value:c.name,onChange:o=>i(s=>({...s,name:o.target.value}))}),e.jsx(I,{id:"dom-id-name",label:"Dom ID",variant:"standard",value:c.domId,onChange:o=>i(s=>({...s,domId:o.target.value})),sx:{alignItems:"center"},InputProps:{endAdornment:e.jsx(K,{position:"end",children:e.jsx(M,{"aria-label":"pick dom id",edge:"end",sx:{paddingLeft:"0px"},disabled:!0,children:e.jsx(X,{})})})}})]}),actions:[e.jsx(d,{handleConfirm:r},"confirm")],children:e.jsx(M,{"aria-label":"Add new part",size:"small",sx:{lineHeight:"0.3em"},onClick:o=>{o.stopPropagation()},children:e.jsx(E,{})})})},Se=({compositionName:t})=>{const n=y({compositionName:t},d=>d?.selectedPart),a=f.useCallback(d=>{n.state&&n.actions.removePart(n.state),d.stopPropagation()},[n]);return e.jsx(M,{"aria-label":"Delete part",id:`delete-part-${n.state}`,role:"delete-part-button",size:"small",sx:{},onClick:a,children:e.jsx(q,{})})};function Ie(t){return e.jsx(F,{fontSize:"inherit",style:{width:14,height:14},...t,children:e.jsx("path",{d:"M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 11.023h-11.826q-.375 0-.669.281t-.294.682v0q0 .401.294 .682t.669.281h11.826q.375 0 .669-.281t.294-.682v0q0-.401-.294-.682t-.669-.281z"})})}function Te(t){return e.jsx(F,{fontSize:"inherit",style:{width:14,height:14},...t,children:e.jsx("path",{d:"M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 12.977h-4.923v4.896q0 .401-.281.682t-.682.281v0q-.375 0-.669-.281t-.294-.682v-4.896h-4.923q-.401 0-.682-.294t-.281-.669v0q0-.401.281-.682t.682-.281h4.923v-4.896q0-.401.294-.682t.669-.281v0q.401 0 .682.281t.281.682v4.896h4.923q.401 0 .682.281t.281.682v0q0 .375-.281.669t-.682.294z"})})}function Re(t){return e.jsx(F,{className:"close",fontSize:"inherit",style:{width:14,height:14},...t,children:e.jsx("path",{d:"M17.485 17.512q-.281.281-.682.281t-.696-.268l-4.12-4.147-4.12 4.147q-.294.268-.696.268t-.682-.281-.281-.682.294-.669l4.12-4.147-4.12-4.147q-.294-.268-.294-.669t.281-.682.682-.281.696 .268l4.12 4.147 4.12-4.147q.294-.268.696-.268t.682.281 .281.669-.294.682l-4.12 4.147 4.12 4.147q.294.268 .294.669t-.281.682zM22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0z"})})}function De(t){const n=oe({from:{opacity:0,transform:"translate3d(20px,0,0)"},to:{opacity:t.in?1:0,transform:`translate3d(${t.in?0:20}px,0,0)`}});return e.jsx(se.div,{style:n,children:e.jsx(ae,{...t})})}const Ee=ee(t=>e.jsx(te,{...t,TransitionComponent:De}))(({theme:t})=>({[`& .${V.iconContainer}`]:{"& .close":{opacity:.3}},[`& .${V.group}`]:{marginLeft:15,paddingLeft:18,borderLeft:`1px dashed ${ne(t.palette.text.primary,.4)}`}}));function qe({compositionName:t,graphId:n,selectedPart:a,selectPart:d,nodeId:l}){const c=u("Graph"),{useGraph:i}=c.hooks,r=i(n,o=>o&&o.adjacencyList[l]&&{node:o.nodes[l],edges:o.edges?Object.values(o.edges).reduce((s,j)=>o.adjacencyList[l].outputs.includes(j.id)?{...s,[j.id]:j}:s,{}):{},connections:o.adjacencyList[l]});return r.state?e.jsx(g,{sx:{color:"text.primary"},children:e.jsx(Ee,{nodeId:l,label:e.jsxs(g,{sx:{height:"30px",alignItems:"center",display:"flex"},onClick:o=>{l!==a&&(d(l),o.stopPropagation())},children:[r.state.node.label,l===a&&e.jsxs(e.Fragment,{children:[e.jsx(Ge,{compositionName:t}),e.jsx(Se,{compositionName:t})]})]}),onClick:()=>{d(l)},sx:{color:l===a?"secondary.main":"secondary.secondary"},children:r.state.connections.outputs.filter(o=>r.state?.edges[o].type==="COMPOSED_OF").map(o=>r.state&&e.jsx(H,{compositionName:t,graphId:n,selectPart:d,selectedPart:a,nodeId:r.state.edges[o].targetId},`${l}-${r.state?.edges[o].targetId}`))})}):e.jsx(e.Fragment,{})}const H=R.memo(qe);function Ae(){const t=u("Store"),n=u("Layout"),a=u("Graph"),{useAppSelector:d}=t.hooks,{useGraph:l}=a.hooks,{selectActiveViewport:c}=n.store.selectors,i=d(c),r=f.useCallback(j=>({name:j?.name,svgPath:j?.svgPath,graphId:j?.graphId,selectedPart:j?.selectedPart}),[]),o=y({viewportName:i},r),s=l(i,j=>j?.adjacencyList);return!o.state?.svgPath||!o.state?.graphId||!o.state?.name||!s?null:e.jsx(re,{"aria-label":"composition tree",defaultExpanded:["root"],defaultCollapseIcon:e.jsx(Ie,{}),defaultExpandIcon:e.jsx(Te,{}),defaultEndIcon:e.jsx(Re,{}),sx:{flexGrow:1,maxWidth:"100%",overflowY:"auto"},children:e.jsx(H,{compositionName:o.state.name,nodeId:"garment",graphId:o.state.graphId,selectPart:o.actions.selectPart,selectedPart:o.state.selectedPart})})}const Le=()=>e.jsx(e.Fragment,{}),Oe=()=>{const t=u("Layout"),{SettingsPanel:n,Accordion:a}=t.components;return e.jsxs(n,{children:[e.jsx(a,{name:"Composição",icon:e.jsx(ie,{}),summary:"composição da peça",children:e.jsx(Ae,{})}),e.jsx(a,{name:"Materiais",icon:e.jsx(le,{}),summary:"Lista de materiais necessários",children:e.jsx(Le,{})}),e.jsx(a,{name:"Prazos",icon:e.jsx(z,{}),summary:"tempo de produção",children:e.jsx(e.Fragment,{})}),e.jsx(a,{name:"Valores",icon:e.jsx(ce,{}),summary:"Preço da peça",children:e.jsx(e.Fragment,{})})]})},$e=R.memo(Oe),Fe=({graphId:t,node:n})=>{const{components:{MaterialSelector:a}}=u("Materials"),d=u("Graph"),{useGraph:l}=d.hooks,c=y({compositionName:t},o=>o),i=l(t,o=>o?.nodes[n.materialId]),r=f.useCallback(o=>c.actions.changeMaterial(n.id,o),[t,n.id]);return e.jsx(a,{type:n.materialType,value:i?.state?.materialId,onChange:r})},_e=({node:t,graphId:n})=>{const a=u("Graph"),{components:{MaterialTypeSelector:d}}=u("Materials"),{useNodeInfo:l,useGraph:c,useSearch:i}=a.hooks,r=c(n,h=>h?.nodes[t.id]),o=f.useMemo(()=>`${t.id}/materialType/restrictions`,[t?.id]),s=i(n,o,()=>{t&&r.actions.search("bfs",t.id,(h,m)=>h.type!=="RESTRICTION"?!1:m.adjacencyList[h.id].inputs.some(k=>{const C=m.edges[k];return C.type==="RESTRICTED_BY"&&C.attr==="materialType"}),()=>!1,1,`Get all restriction associated with ${t.label}`,o)}),j=f.useMemo(()=>s?.findings.reduce((h,m)=>m.restrictionType==="allowOnly"?[...h,...m.operand]:h,[]),[s]),x=l(n,t.materialType),p=y({compositionName:n},h=>h),b=f.useCallback(h=>p.actions.changeMaterialType(t.id,h.target.value),[n,t.id]);return e.jsx(d,{filter:h=>s?.findings.length?j?.includes(h.name):!0,value:x.node?.id,onChange:b})},Be=({graphId:t,nodeId:n})=>{const a=u("Graph"),{useNodeInfo:d}=a.hooks,{node:l}=d(t,n);return e.jsx(A,{role:"material-info",children:e.jsx(L,{disableTypography:!0,primary:e.jsxs(g,{sx:{marginBottom:1},children:[e.jsx(w,{children:l.label}),e.jsx(W,{})]}),secondary:e.jsx(w,{component:"div",children:e.jsx(g,{sx:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:e.jsx(g,{sx:{gap:1,display:"flex",flexWrap:"wrap",flexDirection:"row"},role:"material-attributes","aria-label":"material attributes",children:l.editableAttributes.map(c=>{switch(c){case"materialType":return e.jsx(_e,{graphId:t,node:l},c);case"materialId":return e.jsx(Fe,{graphId:t,node:l},c);default:return e.jsx(e.Fragment,{children:"error"})}})})})})})})},Ve=({isOpen:t,labelState:[n,a],materialTypes:d,handleMaterialTypeChange:l})=>{const{components:{MaterialTypeSelector:c}}=u("Materials");return t?e.jsxs(g,{sx:{display:"flex",flexDirection:"column",flexGrow:2},children:[e.jsx(c,{value:d,onChange:l,multiple:!0}),e.jsx(I,{id:"material-usage-name",label:"Nome",variant:"standard",value:n,onChange:i=>a(i.target.value)})]}):e.jsx(e.Fragment,{})},Ne=({compositionName:t})=>{const n=u("Pointer"),{PointerContainer:a,ConfirmAndCloseButton:d}=n.components,l=y({compositionName:t},x=>x?.selectedPart),[c,i]=f.useState(""),[r,o]=f.useState([]),s=f.useCallback(()=>{l.state&&l.actions.addMaterialUsage(c,l.state,r)},[c]),j=f.useCallback(x=>o(p=>x.target.value),[t]);return e.jsx(a,{component:e.jsx(Ve,{materialTypes:r,handleMaterialTypeChange:j,labelState:[c,i]}),actions:[e.jsx(d,{color:"success",handleConfirm:s},"accept")],children:e.jsx(O,{startIcon:e.jsx(E,{}),variant:"outlined",size:"small",sx:{marginBottom:1},children:"Adicionar material"})})},ze=({compositionName:t,materialUsageId:n})=>{const a=y({compositionName:t},l=>l),d=f.useCallback(()=>{a.actions.removeMaterialUsage(n)},[a]);return e.jsx(M,{color:"error",id:"delete-material",onClick:d,sx:{flexGrow:2},children:e.jsx(q,{})},"delete")},We=({compositionState:t,materialUsageId:n,isOpen:a})=>{const d=u("Graph"),l=u("Layout"),{useNodeInfo:c}=d.hooks,{CRUDGridContext:i}=l.contexts,{CRUDGrid:r,CRUDBooleanCell:o}=l.components,{node:s}=c(t.graphId,n),j=f.useMemo(()=>s.proxies.reduce((p,b)=>({...p,[b.elem]:{...p[b.elem],[b.attr]:!0}}),{}),[s]),{setRows:x}=f.useContext(i);return f.useEffect(()=>x(Object.entries(j).map(([p,b])=>({...b,elem:p,state:"untouched",id:P.uniqueId("proxy-")}))),[j]),a?e.jsxs(g,{role:"link-material-container",sx:{height:"max-content"},children:[e.jsx(w,{variant:"h4",children:"Elementos visuais vinculados"}),e.jsxs(w,{component:"div",children:[e.jsx("p",{children:"A tabela abaixo mostra os atuais elementos visuais vínculados com o material."}),e.jsx("p",{children:"Manipule a tabela para alterar os valores"})]}),e.jsx(r,{addLabel:"Adicionar vínculo",newRecord:()=>({id:P.uniqueId("proxy-"),stroke:!1,fill:!1}),columns:[{field:"elem",editable:!0,flex:1,width:100,minWidth:200,maxWidth:200,renderHeader:()=>"Elemento"},{field:"stroke",editable:!0,width:100,flex:1,minWidth:100,maxWidth:200,renderHeader:()=>"Contorno",renderCell:({value:p})=>e.jsx(N,{checked:p,disabled:!0}),renderEditCell:p=>e.jsx(o,{...p})},{field:"fill",editable:!0,width:100,flex:1,minWidth:100,maxWidth:200,renderHeader:()=>"Preenchimento",renderCell:({value:p})=>e.jsx(N,{checked:p,disabled:!0}),renderEditCell:p=>e.jsx(o,{...p})}]})]}):e.jsx(e.Fragment,{})},Ue=R.memo(We),He=({composition:t,materialUsageId:n,...a})=>{const d=u("Pointer"),l=u("Layout"),{ConfirmAndCloseButton:c}=d.components,{CRUDGridContext:i}=l.contexts,{rows:r}=f.useContext(i),o=f.useCallback(()=>{r.filter(s=>s.state==="deleted").forEach(s=>t.actions.deleteProxy(s.elem,n)),r.filter(s=>s.state==="modified").forEach(s=>{t.actions.deleteProxy(s.old.elem,n),s.stroke&&t.actions.addProxy({elem:s.elem,attr:"stroke"},n),s.fill&&t.actions.addProxy({elem:s.elem,attr:"fill"},n)}),r.filter(s=>s.state==="added").forEach(s=>{t.actions.deleteProxy(s.elem,n),s.stroke&&t.actions.addProxy({elem:s.elem,attr:"stroke"},n),s.fill&&t.actions.addProxy({elem:s.elem,attr:"fill"},n)})},[r]);return e.jsx(c,{color:"success",...a,handleConfirm:o})},Qe=({compositionName:t,materialUsageId:n})=>{const a=y({compositionName:t},r=>r),d=u("Pointer"),l=u("Layout"),{PointerContainer:c}=d.components,{CRUDGridProvider:i}=l.components;return a.state?e.jsx(i,{initialRows:[],children:e.jsx(c,{component:e.jsx(Ue,{compositionState:a.state,materialUsageId:n}),actions:[e.jsx(He,{composition:a,materialUsageId:n},"accept")],children:e.jsx(M,{id:"configure-material",sx:{flexGrow:2},children:e.jsx(de,{})},"configure")})}):e.jsx(e.Fragment,{})};function Ye({node:t}){switch(t.restrictionType){case"allowOnly":return e.jsx(e.Fragment,{children:t.operand.join(",")});case"sameAs":return e.jsx(e.Fragment,{children:t.operand});default:return e.jsx(e.Fragment,{})}}function Ze({row:t,...n}){const{components:{CRUDMaterialTypeCell:a}}=u("Materials");switch(t.attribute){case"materialType":return e.jsx(a,{row:t,value:t.operand,...n,multiple:t.restrictionType==="allowOnly"});default:return e.jsx(e.Fragment,{})}}const Je=({compositionState:t,materialUsageId:n})=>{const a=u("Graph"),d=u("Layout"),{useGraph:l,useSearch:c}=a.hooks,{CRUDGridContext:i}=d.contexts,{CRUDGrid:r}=d.components,{state:o,actions:{search:s}}=l(t.graphId,h=>h?.nodes[n]),j=f.useMemo(()=>`${n}/restrictions`,[n]),x=c(t.graphId,j,()=>{o&&s("bfs",o.id,(h,m)=>h.type!=="RESTRICTION"?!1:m.adjacencyList[h.id].inputs.some(k=>m.edges[k].type==="RESTRICTED_BY"),()=>!1,1,`Get all restriction associated with ${o?.label??o.id}`,j)}),{setRows:p}=f.useContext(i);f.useEffect(()=>{x?.findings&&p(x.findings.map(h=>({...h,state:"untouched"})))},[x]),f.useEffect(()=>{x?.findings&&p(x.findings)},[]);const b=[{field:"label",editable:!0,flex:1,width:100,minWidth:200,maxWidth:400,renderHeader:()=>"Restrição"},{field:"attribute",editable:!0,flex:1,width:100,minWidth:200,maxWidth:400,renderHeader:()=>"Atributo",renderCell:({value:h})=>e.jsx(e.Fragment,{children:h})},{field:"restrictionType",editable:!0,flex:1,width:100,minWidth:200,maxWidth:400,renderHeader:()=>"Operador"},{field:"operand",editable:!0,flex:1,width:100,minWidth:200,maxWidth:400,renderHeader:()=>"Operando",renderCell:({row:h})=>e.jsx(Ye,{node:h}),renderEditCell:h=>e.jsx(Ze,{...h})}];return e.jsxs(g,{role:"restrictions-management-container",children:[e.jsx(w,{variant:"h4",children:"Restrições do material"}),e.jsxs(w,{component:"div",children:[e.jsx("p",{children:"A tabela abaixo mostra as atuais restrições para este material."}),e.jsxs("p",{children:["Quando essas condições são quebradas o modelo é considerado"," ",e.jsx("strong",{children:"inválido"}),"."]})]}),e.jsx(r,{addLabel:"Adicionar restrição",newRecord:()=>({id:P.uniqueId("hard-restriction-"),label:"Nova restricao",operand:[],restrictionType:"allowOnly",attribute:"materialType"}),columns:b})]})},Ke=t=>t.isOpen?e.jsx(g,{role:"add-restriction-container",sx:{height:"max-content",display:"flex",gap:2,justifyContent:"space-between",flexDirection:"column",padding:1},children:e.jsx(Je,{...t})}):e.jsx("div",{}),Xe=({composition:t,materialUsageId:n,...a})=>{const d=u("Pointer"),l=u("Layout"),{ConfirmAndCloseButton:c}=d.components,{CRUDGridContext:i}=l.contexts,{rows:r}=f.useContext(i),o=f.useCallback(()=>{console.group("delete"),r.filter(s=>s.state==="deleted").forEach(s=>t.actions.removeRestriction(n,s.id)),console.groupEnd(),console.group("modified"),r.filter(s=>s.state==="modified").forEach(s=>{t.actions.updateRestriction(n,s.id,s)}),console.groupEnd(),console.group("added"),r.filter(s=>s.state==="added").forEach(s=>{t.actions.addRestriction(n,{type:"RESTRICTION",id:s.id,label:s.label,operand:s.operand,position:s.position,restrictionType:s.restrictionType,attribute:s.attribute})}),console.groupEnd()},[r]);return e.jsx(c,{color:"success",...a,handleConfirm:o})},et=({sx:t,materialUsageId:n,compositionName:a,...d})=>{const l=y({compositionName:a},s=>s),c=u("Pointer"),i=u("Layout"),{PointerContainer:r}=c.components,{CRUDGridProvider:o}=i.components;return l.state?e.jsx(o,{initialRows:[],children:e.jsx(r,{component:e.jsx(Ke,{compositionState:l.state,materialUsageId:n}),actions:[e.jsx(Xe,{composition:l,materialUsageId:n},"accept")],children:e.jsx(M,{id:"restrict-material",sx:{flexGrow:2},children:e.jsx(ue,{})},"restrict")})}):e.jsx(e.Fragment,{})},tt=t=>e.jsxs(g,{sx:{display:"flex",flexDirection:"column",padding:0,justifyContent:"space-around",alignContent:"space-evenly"},role:"actions",children:[e.jsx(ze,{...t}),e.jsx(Qe,{...t}),e.jsx(et,{...t,sx:{hover:{fill:"yellow"}}})]});function Q({compositionName:t,selectedPart:n,graphId:a}){const d=u("Graph"),{useNodeInfo:l}=d.hooks,{edges:c}=l(a,n);return e.jsxs($,{sx:{width:"100%"},role:"material-list",children:[e.jsx(Ne,{compositionName:t}),Object.values(c).filter(i=>i.type==="MADE_OF").map(i=>e.jsxs(D,{variant:"outlined",square:!0,sx:{width:"100%",padding:1,"&:div + div":{borderTop:0},display:"flex"},role:"material-container",children:[e.jsx(Be,{graphId:a,nodeId:i.targetId}),e.jsx(tt,{compositionName:t,materialUsageId:i.targetId})]},i.targetId))]})}const nt=({graphId:t,nodeId:n})=>{const a=u("Graph"),d=u("Converter"),{useNodeInfo:l}=a.hooks,{useUnits:c}=d.hooks,{node:i}=l(t,n),r=c([i.cost.dividend.unit,i.cost.quotient.unit,i.time_taken.dividend.unit,i.time_taken.quotient.unit]);return r?e.jsx(A,{children:e.jsx(L,{disableTypography:!0,primary:e.jsxs(g,{sx:{marginBottom:1},children:[e.jsx(w,{children:i.label}),e.jsx(W,{})]}),secondary:e.jsx(w,{component:"div",sx:{padding:1},children:e.jsxs(g,{sx:{display:"flex",justifyContent:"space-between"},role:"material-attributes","aria-label":"material attributes",children:[e.jsxs(g,{sx:{display:"flex",gap:.3,alignItems:"center"},children:[e.jsx(z,{})," ",i.time_taken.quotient.amount," ",r[i.time_taken.quotient.unit].abbreviation," /"," ",i.time_taken.dividend.amount," ",r[i.time_taken.dividend.unit].abbreviation]}),e.jsxs(g,{sx:{display:"flex",gap:.3,alignItems:"center"},children:[e.jsx(pe,{})," ",i.cost.quotient.amount," ",r[i.cost.quotient.unit].abbreviation," /"," ",i.cost.dividend.amount," ",r[i.cost.dividend.unit].abbreviation]})]})})})}):e.jsx(e.Fragment,{})},ot=({compositionName:t})=>{const n=u("Pointer"),a=u("Converter"),{PointerContainer:d,ConfirmAndCloseButton:l}=n.components,{CompoundSelector:c}=a.components;a.hooks;const i=y({compositionName:t},x=>x?.selectedPart),r=f.useMemo(()=>P.uniqueId("new-process-form"),[]),[o,s]=f.useState({label:"",cost:{quotient:{amount:1,unit:"reais11"},dividend:{amount:1,unit:"unitario18"}},time_taken:{quotient:{amount:1,unit:"minutos249"},dividend:{amount:1,unit:"unitario18"}}}),j=f.useCallback(x=>{x.preventDefault(),x.stopPropagation(),i.state&&i.actions.addOperation(o.label,o.cost,o.time_taken,i.state)},[o]);return e.jsx(d,{component:e.jsxs(g,{component:"form",onSubmit:j,id:r,sx:{display:"flex",flexDirection:"column",flexGrow:2,gap:1},children:[e.jsx(_,{children:e.jsx(I,{id:"name",label:"Nome",variant:"standard",sx:{marginBottom:1},onChange:x=>s(p=>({...p,label:x.target.value})),value:o.label})}),e.jsx(c,{id:"time-taken",label:"Tempo",filterDividends:x=>x.abbreviation==="un",filterQuotients:(x,p)=>p?.name==="Temporal",value:o.time_taken,onChange:x=>s(p=>({...p,time_taken:x}))}),e.jsx(c,{id:"cost",label:"Custo",filterDividends:(x,p)=>x.abbreviation==="un"||p?.name=="Temporal",filterQuotients:(x,p)=>p?.name==="Monetaria",value:o.cost,onChange:x=>s(p=>({...p,cost:x}))})]}),actions:[e.jsx(l,{type:"submit",form:r,value:"Submit",color:"success",handleConfirm:()=>null},"accept")],children:e.jsx(O,{startIcon:e.jsx(E,{}),variant:"outlined",size:"small",sx:{marginBottom:1},children:"Adicionar processo"})})},st=({compositionName:t,processId:n})=>{const a=y({compositionName:t},l=>l),d=f.useCallback(()=>{a.actions.removeOperation(n)},[a]);return e.jsx(M,{color:"error",id:`delete-process-${n}`,onClick:d,sx:{flexGrow:2},children:e.jsx(q,{})},"delete")},at=({id:t,field:n,graphId:a,partId:d,value:l})=>{const c=u("Graph"),{useGraph:i}=c.hooks,r=U(),o=p=>Object.values(p).filter(b=>b.type==="MADE_OF"&&b.sourceId===d),s=(p,b)=>Object.entries(p).reduce((h,[m,v])=>b.includes(m)?{...h,[m]:v}:h,{}),{state:j}=i(a,p=>p&&{edges:o(p.edges),nodes:s(p.nodes,o(p.edges).map(b=>b.targetId))}),x=f.useCallback(p=>{r.current.setEditCellValue({id:t,field:n,value:p.target.value})},[a,d]);return j?e.jsxs(_,{sx:{m:1,minWidth:120,width:"min-content"},size:"small",children:[e.jsx(me,{id:"label",children:"Material"}),e.jsx(xe,{labelId:"label",id:"material-type",value:l??"",label:"Material",autoWidth:!0,onChange:x,children:j.edges.map(p=>e.jsx(he,{value:p.targetId,children:j.nodes[p.targetId].label},p.id))})]}):e.jsx(e.Fragment,{})};function rt({row:t,id:n,field:a}){const d=U(),l=u("Converter"),{components:{CompoundSelector:c}}=l,i=f.useCallback(r=>{d.current.setEditCellValue({id:n,field:a,value:r})},[n]);return e.jsx(c,{id:"quantity",filterQuotients:(r,o)=>o?.name==="Comprimento"||o?.name==="Volume"||o?.name==="Area",filterDividends:(r,o)=>r.abbreviation==="un",value:t.quantity,onChange:i})}const it=({compositionState:t,processId:n})=>{const a=u("Graph"),d=u("Layout"),l=u("Converter"),{useGraph:c}=a.hooks,{CRUDGridContext:i}=d.contexts,{CRUDGrid:r}=d.components,{components:{CompoundUnit:o}}=l,s=m=>Object.values(m).filter(v=>v.type==="MADE_OF"&&v.sourceId===t.selectedPart),j=(m,v)=>Object.entries(m).reduce((S,[k,C])=>v.includes(k)?{...S,[k]:C}:S,{}),{state:x}=c(t.graphId,m=>m&&{edges:s(m.edges),nodes:j(m.nodes,s(m.edges).map(v=>v.targetId))}),{state:p}=c(t.graphId,m=>m?.edges&&Object.values(m.edges).filter(v=>v.type==="CONSUMES"&&v.sourceId===n)),{setRows:b}=f.useContext(i);if(f.useEffect(()=>{p?.length&&b(p.map(m=>({...m,state:"untouched"})))},p),!x)return e.jsx(e.Fragment,{});const h=[{field:"targetId",editable:!0,flex:2,minWidth:200,renderCell:({row:{targetId:m},value:v})=>e.jsx(e.Fragment,{children:x.nodes[m]?.label}),renderEditCell:({value:m,...v})=>e.jsx(at,{value:m??v.row.targetId,partId:t.selectedPart,graphId:t.graphId,...v}),renderHeader:()=>"Material"},{field:"quantity",editable:!0,flex:2,width:800,minWidth:500,align:"center",headerAlign:"center",renderHeader:()=>"Quantidade",renderCell:({row:{quantity:m}})=>e.jsx(o,{value:m}),renderEditCell:m=>e.jsx(rt,{...m})}];return e.jsxs(g,{role:"material-usage-management-container",children:[e.jsx(w,{variant:"h4",children:"Materiais consumidos"}),e.jsxs(w,{component:"div",children:[e.jsx("p",{children:"A tabela abaixo mostra os materiais utilizados neste processo."}),e.jsx("p",{children:"Essas informações são utilizadas para calcular o custo em tempo e dinheiro da peça."})]}),e.jsx(r,{addLabel:"Víncular material",newRecord:()=>({id:P.uniqueId("material-usage-"),type:"CONSUMES",sourceId:n,targedId:"",quantity:{quotient:{amount:1,unit:"metrosquadrados17"},dividend:{amount:1,unit:"unitario18"}}}),columns:h})]})},lt=t=>t.isOpen?e.jsx(g,{role:"material-usage-container",sx:{height:"max-content",display:"flex",gap:2,justifyContent:"space-between",flexDirection:"column",padding:1},children:e.jsx(it,{...t})}):e.jsx("div",{}),ct=({composition:t,processId:n,...a})=>{const d=u("Pointer"),l=u("Layout"),{ConfirmAndCloseButton:c}=d.components,{CRUDGridContext:i}=l.contexts,{rows:r}=f.useContext(i),o=f.useCallback(()=>{r.filter(s=>s.state==="deleted").forEach(s=>{t.actions.deleteMaterialConsuption(s.id)}),r.filter(s=>s.state==="modified").forEach(({id:s,targetId:j,quantity:x})=>{t.actions.updateMaterialConsuption(s,{targetId:j,quantity:x})}),r.filter(s=>s.state==="added").forEach(s=>{t.actions.addMaterialConsuption(n,s.targetId,s.quantity)})},[r]);return e.jsx(c,{color:"success",...a,handleConfirm:o})},dt=({sx:t,compositionName:n,processId:a,...d})=>{const l=y({compositionName:n},s=>s),c=u("Pointer"),i=u("Layout"),{PointerContainer:r}=c.components,{CRUDGridProvider:o}=i.components;return l.state?e.jsx(o,{initialRows:[],children:e.jsx(r,{component:e.jsx(lt,{processId:a,compositionState:l.state}),actions:[e.jsx(ct,{composition:l,processId:a},"accept")],children:e.jsx(M,{color:"default",id:"configure-process",sx:{flexGrow:2},children:e.jsx(fe,{})},"configure")})}):e.jsx(e.Fragment,{})},ut=t=>e.jsxs(g,{sx:{display:"flex",flexDirection:"column",padding:0,justifyContent:"space-around",alignContent:"space-evenly"},role:"actions",children:[e.jsx(st,{...t}),e.jsx(dt,{...t})]});function Y({compositionName:t,selectedPart:n,graphId:a}){const d=u("Graph"),{useNodeInfo:l}=d.hooks,{edges:c}=l(a,n);return e.jsxs($,{sx:{width:"100%"},role:"processes-list",children:[e.jsx(ot,{compositionName:t}),Object.values(c).filter(i=>i.type==="PROCESS_NEEDED").map(i=>e.jsxs(D,{variant:"outlined",square:!0,sx:{width:"100%",padding:1,"&:div + div":{borderTop:0},display:"flex"},role:"process-container",children:[e.jsx(nt,{graphId:a,nodeId:i.targetId}),e.jsx(ut,{compositionName:t,processId:i.targetId})]},i.targetId))]})}const pt=({compositionName:t,graphId:n})=>{const a=u("Pointer"),d=u("Graph"),{PointerContainer:l,ConfirmAndCloseButton:c}=a.components,{useGraph:i}=d.hooks,r=y({compositionName:t},h=>h?.selectedPart),o=i(n,h=>h?Object.values(h.nodes).filter(m=>m.type==="GRADE").map(m=>({...m,order:Object.values(h.edges).find(v=>v.targetId===m.id)?.order})):[]),s=f.useMemo(()=>o.state?je.max(o.state.filter(h=>P.isNumber(h?.order)).map(h=>h.order))??0:0,[o]),j=f.useMemo(()=>P.uniqueId("new-process-form"),[]),[x,p]=f.useState({abbreviation:""}),b=f.useCallback(h=>{h.preventDefault(),h.stopPropagation(),r.state&&r.actions.addGrade(x.abbreviation,s+1)},[x.label,x.abbreviation,s,r.state]);return e.jsx(l,{component:e.jsx(g,{component:"form",onSubmit:b,id:j,sx:{display:"flex",flexDirection:"column",flexGrow:2,gap:1},children:e.jsx(_,{children:e.jsx(I,{id:"abbreviation",label:"Abreviação",variant:"standard",sx:{marginBottom:1},onChange:h=>p(m=>({...m,abbreviation:h.target.value})),value:x.abbreviation})})}),actions:[e.jsx(c,{type:"submit",form:j,value:"Submit",color:"success",handleConfirm:()=>null},"accept")],children:e.jsx(O,{startIcon:e.jsx(E,{}),variant:"outlined",size:"small",sx:{marginBottom:1},children:"Adicionar Grade"})})};function mt({compositionName:t,graphId:n}){const a=u("Graph"),{useGraph:d}=a.hooks,l=d(n,r=>r?Object.values(r.nodes).filter(o=>o.type==="GRADE").map(o=>({...o,order:Object.values(r.edges).find(s=>s.targetId===o.id)?.order})).filter(o=>P.isNumber(o?.order)).sort((o,s)=>o?.order-s?.order):[]),c=y({compositionName:t},r=>r?.selectedPart),i=f.useCallback(r=>{c.actions.removeGrade(r)},[t]);return l.state?e.jsxs($,{sx:{width:"100%"},role:"material-list",children:[e.jsx(pt,{graphId:n,compositionName:t}),l.state.map(r=>e.jsxs(D,{variant:"outlined",square:!0,sx:{width:"100%",padding:1,"&:div + div":{borderTop:0},display:"flex"},role:"grade-container",children:[e.jsx(A,{role:"grade-info",children:e.jsx(L,{disableTypography:!0,primary:e.jsx(w,{children:r.abbreviation})})}),e.jsx(g,{sx:{display:"flex",flexDirection:"column",padding:0,justifyContent:"space-around",alignContent:"space-evenly"},role:"actions",children:e.jsx(M,{color:"error",id:"delete-material",onClick:()=>i(r.id),sx:{flexGrow:2},children:e.jsx(q,{})},"delete")})]},r.id))]}):e.jsx(e.Fragment,{})}const xt=t=>{const n=u("Layout"),{Accordion:a}=n.components;return e.jsx(a,{name:"Graduação",icon:e.jsx(ge,{}),summary:"Graduação da peça",sx:{flexGrow:1},children:e.jsx(mt,{...t})})},ht=({node:t,graphId:n,selectedPart:a,compositionName:d})=>{const l=u("Layout"),c=u("Markdown"),{components:{MarkdownReader:i}}=c,{DetailsPanel:r,Accordion:o,CustomTextArea:s,SystemModal:j}=l.components,[x,p]=f.useState({name:t.label??"Nova peça",description:t.description??""}),b=y({compositionName:d},m=>m),h=f.useCallback(()=>{b.actions.changeProperties(x.name,x.description)},[d,x.name,x.description]);return e.jsxs(r,{title:t.label,id:"gamerment-panel",children:[e.jsx(o,{name:"Propriedades",icon:e.jsx(ve,{}),summary:"Propriedades da peça",sx:{flexGrow:1},children:e.jsxs(D,{variant:"outlined",square:!0,sx:{width:"100%",padding:1,"&:div + div":{borderTop:0},display:"flex",justifyContent:"space-between"},role:"garment-properties",id:"garment-properties",children:[e.jsxs(g,{sx:{display:"flex",flexDirection:"column",width:"100%",gap:1},children:[e.jsx(I,{id:"garment-name",label:"Nome",variant:"standard",sx:{width:"100%"},value:x?.name,onChange:m=>p(v=>v&&{...v,name:m.target.value})}),e.jsx(s,{id:"description",wrapperProps:{sx:{width:"100%"}},minRows:3,name:"Outlined",placeholder:"Descrição",color:"neutral",value:x.description,onChange:m=>{m.preventDefault(),m.stopPropagation(),p(v=>v&&{...v,description:m.target.value})}},"description")]}),e.jsxs(g,{sx:{display:"flex",flexDirection:"column",padding:0,gap:1,justifyContent:"space-between",alignContent:"space-evenly"},role:"actions",children:[e.jsx(M,{color:"success",id:"save-properties",onClick:m=>h(),children:e.jsx(be,{})},"save"),e.jsx(j,{component:e.jsx(i,{content:x.description}),button:e.jsx(M,{color:"warning",id:"preview-description",children:e.jsx(ye,{})},"preview")}),e.jsx(M,{color:"info",id:"reset-properties",onClick:m=>p({name:t.label,description:t.description}),children:e.jsx(Ce,{})},"reset")]})]},"garment-properties")}),e.jsx(xt,{graphId:n,compositionName:d,selectedPart:a}),e.jsx(o,{name:"Materiais",icon:e.jsx(T,{}),summary:"Lista de materiais",sx:{flexGrow:1},children:e.jsx(Q,{graphId:n,selectedPart:a,compositionName:d})}),e.jsx(o,{name:"Processos",icon:e.jsx(T,{}),summary:"Lista de processos",sx:{flexGrow:1},children:e.jsx(Y,{graphId:n,selectedPart:a,compositionName:d})})]},"garment-panel")},ft=()=>{const t=u("Layout"),n=u("Store"),{useAppSelector:a}=n.hooks,{selectActiveViewport:d}=t.store.selectors,l=a(d),c=f.useCallback(r=>({name:r?.name,graphId:r?.graphId,selectedPart:r?.selectedPart}),[]),i=y({viewportName:l},c);return!i.state?.selectedPart||!i.state?.graphId||!i.state?.name?null:e.jsx(jt,{graphId:i.state.graphId,selectedPart:i.state.selectedPart,compositionName:i.state.name})},jt=({graphId:t,selectedPart:n,compositionName:a})=>{const d=u("Layout"),l=u("Graph"),{DetailsPanel:c,Accordion:i}=d.components,{useGraph:r}=l.hooks,o=r(t,s=>s?.nodes[n]);return o.state?.type==="GARMENT"?e.jsx(ht,{node:o.state,graphId:t,compositionName:a,selectedPart:n}):e.jsxs(c,{title:o.state?.label??n,children:[e.jsx(i,{name:"Opcionais",icon:e.jsx(T,{}),summary:"Lista de opcionais",sx:{flexGrow:1},children:e.jsx(e.Fragment,{})}),e.jsx(i,{name:"Materiais",icon:e.jsx(T,{}),summary:"Lista de materiais",sx:{flexGrow:1},children:e.jsx(Q,{graphId:t,selectedPart:n,compositionName:a})}),e.jsx(i,{name:"Processos",icon:e.jsx(T,{}),summary:"Lista de processos",sx:{flexGrow:1},children:e.jsx(Y,{graphId:t,selectedPart:n,compositionName:a})})]})},gt=R.memo(ft),Gt=()=>{const t=u("Store"),n=u("Layout"),{useAppSelector:a}=t.hooks,{selectActiveViewport:d}=n.store.selectors,l=a(d),c=f.useCallback(r=>r,[l]),i=y({viewportName:l},c);return!l||!i.state?null:e.jsx(vt,{selectPart:i.actions.selectPart,compositionInfo:i.state})},vt=({compositionInfo:t,selectPart:n})=>{const{components:{SVGViewer:a},hooks:{useSVG:d}}=u("SVG"),{components:{MultiTouchPanel:l}}=u("Pointer"),{hooks:{useGraph:c}}=u("Graph"),i=u("Layout"),r=u("Orders"),{BudgetFloatingButton:o}=r.components,{ViewportNotificationsTray:s}=i.components,{graphId:j,svgPath:x,name:p,viewportName:b}=t,h=B(),m=c(j,C=>C?.nodes),v=d(x,C=>C?.instances[p]),S=f.useCallback(C=>{m.state&&Object.values(m.state).filter(G=>G.type==="PART").forEach(G=>{if(G.domId){const[Z]=[...C?.querySelectorAll(`#${G.domId}`)];Z.addEventListener("click",J=>{J.stopPropagation(),n(G.id)})}})},[j]),k=f.useCallback(()=>{h.functions.createDebugView(p,b)},[]);return e.jsxs(e.Fragment,{children:[e.jsxs(g,{role:"composer-viewport",sx:{padding:1,height:"100%",position:"relative",cursor:"crosshair",overflow:"hidden"},children:[e.jsx(l,{gestures:{onPinch:C=>{v.actions.setZoom(p,C.offset[0])},onWheel:C=>{const G=v.state?.zoom??1;v.actions.setZoom(p,G+C.delta[1]*.001)}},children:e.jsx(a,{instanceName:p,path:x,beforeInjection:S})}),e.jsx(s,{children:e.jsx(Me,{fontSize:"small",onClick:k,sx:{":hover":{cursor:"pointer",color:"primary.main"}}})}),e.jsx($e,{}),e.jsx(gt,{})]}),e.jsx(o,{})]})},bt=({instanceName:t,path:n,...a})=>{const d=u("SVG"),{components:{SVGViewer:l},hooks:{useSVGManager:c}}=d,i=c();return f.useLayoutEffect(()=>{i.functions.loadSVG(n,`${t}-preview`)},[]),e.jsx(l,{...a,instanceName:`${t}-preview`,path:n})},yt=we(g)`
  display: flex;
  flex-direction: row;
  max-height: 85vh;

  @media (orientation: portrait) {
    flex-direction: column;
  }
`,Ct=({closeModal:t,onModelSelection:n})=>{const a=u("Markdown"),{components:{MarkdownReader:d}}=a,l=ke(),[c,i]=f.useState(void 0);return e.jsx(D,{elevation:6,id:"open-model-modal",sx:{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%, -50%)",bgcolor:"background.paper",width:"85vw",overflow:"hidden",maxHeight:"85vh",p:2},children:e.jsxs(yt,{role:"model-selector-container",sx:{gap:1},children:[e.jsx($,{role:"list-options",sx:{paddingRight:5,overflow:"auto"},children:l.map(r=>e.jsx(A,{disableGutters:!0,children:e.jsx(L,{primary:r.name,secondary:null,id:r.name,color:c?.name===r.name?"primary":"secondary",onClick:()=>i({name:r.name,path:r.svgPath,descriptionPath:r.descriptionPath}),sx:{cursor:"pointer",flexGrow:1}})},P.uniqueId()))}),e.jsxs(g,{sx:{overflow:"auto",width:"100%"},children:[c?e.jsx(bt,{instanceName:c.name,path:c.path,sx:{gridArea:"preview",p:1}}):e.jsx(g,{sx:{p:1,display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("span",{children:"Selecione um modelo"})}),c?.descriptionPath&&e.jsx(g,{role:"model-description",sx:{flexGrow:1,p:1,gridArea:"description",overflowY:"auto",height:"min-content"},children:e.jsx(d,{path:c.descriptionPath})})]}),e.jsx(g,{role:"actions",sx:{position:"absolute",top:10,right:10,display:"flex",flexDirection:"row-reverse"},children:e.jsx(O,{disabled:!c,variant:"contained",onClick:()=>{c&&(n(c.name,c.path),t?.())},children:"Selecionar"})})]})})},St=()=>{const t=B(),n=u("Layout"),{SystemModal:a}=n.components,d=f.useCallback((l,c)=>{t.functions.createComposition(l,c)},[]);return e.jsx(a,{component:e.jsx(Ct,{onModelSelection:d}),button:e.jsx(M,{children:e.jsx(Pe,{})})})},Mt=({name:t})=>{const n=u("Graph"),a=u("Layout"),{ViewportNotificationsTray:d,DetailsPanel:l,SettingsPanel:c,Accordion:i}=a.components,{components:{GraphViewer:r}}=n,o=B(),s=f.useMemo(()=>o.functions.findComposition(j=>j.debugViewport===t),[t]);return e.jsxs(g,{role:"composer-debugger-viewport",sx:{padding:1,height:"100%",position:"relative",overflow:"hidden"},children:[s&&e.jsx(r,{graphId:s?.graphId}),e.jsx(d,{children:e.jsx(e.Fragment,{})}),e.jsxs(c,{title:"Configurações",children:[e.jsx(i,{name:"Tipos de nodos",summary:"Tipos de nodos disponiveis",children:e.jsx(e.Fragment,{})}),e.jsx(e.Fragment,{})]}),e.jsx(l,{children:e.jsx(e.Fragment,{})})]})},It=R.memo(Mt);export{Gt as C,It as D,St as M};
