import{r as p,o as e,B as C,aD as R,aE as Q,I as P,aF as J,$ as A,aG as L,H as K,aH as X,aI as _,aJ as ee,R as I,aK as te,aL as ne,aM as se,aN as oe,S as D,aO as ae,aP as re,aQ as ie,aR as z,aS as $,aT as F,T as w,aU as U,Z as G,_ as k,a3 as V,aV as le,aW as ce,aX as O,P as T,aY as de,aZ as N,a2 as W,a_ as ue,a$ as me,b0 as H,y as pe,b1 as E,b2 as xe,b3 as he,b4 as fe,b5 as je,b6 as ge,b7 as Ce,b8 as ve,ah as be,b9 as ye}from"../../vendor-4a2caf03.js";import{n as u}from"../../kernel-7bfe83e7.js";import{u as M,a as B,b as Me}from"./hooks-6a7da7fd.js";const we=({compositionName:t})=>{const n=u("Pointer"),{PointerContainer:a,ConfirmAndCloseButton:l}=n.components,s=M(t,r=>r?.selectedPart),[i,d]=p.useState({name:"",domId:""}),c=p.useCallback(()=>{s.actions.addPart(i.name,i.domId,s.state)},[i]);return e.jsx(a,{component:e.jsxs(C,{sx:{width:200},children:[e.jsx(R,{id:"part-name",label:"Nome",variant:"standard",value:i.name,onChange:r=>d(o=>({...o,name:r.target.value}))}),e.jsx(R,{id:"dom-id-name",label:"Dom ID",variant:"standard",value:i.domId,onChange:r=>d(o=>({...o,domId:r.target.value})),sx:{alignItems:"center"},InputProps:{endAdornment:e.jsx(Q,{position:"end",children:e.jsx(P,{"aria-label":"pick dom id",edge:"end",sx:{paddingLeft:"0px"},disabled:!0,children:e.jsx(J,{})})})}})]}),actions:[e.jsx(l,{handleConfirm:c},"confirm")],children:e.jsx(P,{"aria-label":"Add new part",size:"small",sx:{lineHeight:"0.3em"},onClick:r=>{r.stopPropagation()},children:e.jsx(A,{})})})},Pe=({compositionName:t})=>{const n=M(t,l=>l?.selectedPart),a=p.useCallback(l=>{n.state&&n.actions.removePart(n.state),l.stopPropagation()},[n]);return e.jsx(P,{"aria-label":"Delete part",id:`delete-part-${n.state}`,role:"delete-part-button",size:"small",sx:{},onClick:a,children:e.jsx(L,{})})};function Se(t){return e.jsx(D,{fontSize:"inherit",style:{width:14,height:14},...t,children:e.jsx("path",{d:"M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 11.023h-11.826q-.375 0-.669.281t-.294.682v0q0 .401.294 .682t.669.281h11.826q.375 0 .669-.281t.294-.682v0q0-.401-.294-.682t-.669-.281z"})})}function ke(t){return e.jsx(D,{fontSize:"inherit",style:{width:14,height:14},...t,children:e.jsx("path",{d:"M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 12.977h-4.923v4.896q0 .401-.281.682t-.682.281v0q-.375 0-.669-.281t-.294-.682v-4.896h-4.923q-.401 0-.682-.294t-.281-.669v0q0-.401.281-.682t.682-.281h4.923v-4.896q0-.401.294-.682t.669-.281v0q.401 0 .682.281t.281.682v4.896h4.923q.401 0 .682.281t.281.682v0q0 .375-.281.669t-.682.294z"})})}function Ie(t){return e.jsx(D,{className:"close",fontSize:"inherit",style:{width:14,height:14},...t,children:e.jsx("path",{d:"M17.485 17.512q-.281.281-.682.281t-.696-.268l-4.12-4.147-4.12 4.147q-.294.268-.696.268t-.682-.281-.281-.682.294-.669l4.12-4.147-4.12-4.147q-.294-.268-.294-.669t.281-.682.682-.281.696 .268l4.12 4.147 4.12-4.147q.294-.268.696-.268t.682.281 .281.669-.294.682l-4.12 4.147 4.12 4.147q.294.268 .294.669t-.281.682zM22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0z"})})}function Ge(t){const n=te({from:{opacity:0,transform:"translate3d(20px,0,0)"},to:{opacity:t.in?1:0,transform:`translate3d(${t.in?0:20}px,0,0)`}});return e.jsx(ne.div,{style:n,children:e.jsx(se,{...t})})}const Re=K(t=>e.jsx(X,{...t,TransitionComponent:Ge}))(({theme:t})=>({[`& .${_.iconContainer}`]:{"& .close":{opacity:.3}},[`& .${_.group}`]:{marginLeft:15,paddingLeft:18,borderLeft:`1px dashed ${ee(t.palette.text.primary,.4)}`}}));function Te({compositionName:t,graphId:n,selectedPart:a,selectPart:l,nodeId:s}){const i=u("Graph"),{useGraph:d}=i.hooks,c=d(n,r=>r&&r.adjacencyList[s]&&{node:r.nodes[s],edges:r.edges?Object.values(r.edges).reduce((o,m)=>r.adjacencyList[s].outputs.includes(m.id)?{...o,[m.id]:m}:o,{}):{},connections:r.adjacencyList[s]});return c.state?e.jsx(C,{sx:{color:"text.primary"},children:e.jsx(Re,{nodeId:s,label:e.jsxs(C,{sx:{height:"30px",alignItems:"center",display:"flex"},onClick:r=>{s!==a&&(l(s),r.stopPropagation())},children:[c.state.node.label,s===a&&e.jsxs(e.Fragment,{children:[e.jsx(we,{compositionName:t}),e.jsx(Pe,{compositionName:t})]})]}),onClick:()=>{l(s)},sx:{color:s===a?"secondary.main":"secondary.secondary"},children:c.state.connections.outputs.filter(r=>c.state?.edges[r].type==="COMPOSED_OF").map(r=>c.state&&e.jsx(Y,{compositionName:t,graphId:n,selectPart:l,selectedPart:a,nodeId:c.state.edges[r].targetId},`${s}-${c.state?.edges[r].targetId}`))})}):e.jsx(e.Fragment,{})}const Y=I.memo(Te);function Ee(){const t=u("Store"),n=u("Layout"),a=u("Graph"),{useAppSelector:l}=t.hooks,{useGraph:s}=a.hooks,{selectActiveViewport:i}=n.store.selectors,d=l(i),c=p.useCallback(m=>({name:m?.name,svgPath:m?.svgPath,graphId:m?.graphId,selectedPart:m?.selectedPart}),[]),r=M(d,c),o=s(d,m=>m?.adjacencyList);return!r.state?.svgPath||!r.state?.graphId||!r.state?.name||!o?null:e.jsx(oe,{"aria-label":"composition tree",defaultExpanded:["root"],defaultCollapseIcon:e.jsx(Se,{}),defaultExpandIcon:e.jsx(ke,{}),defaultEndIcon:e.jsx(Ie,{}),sx:{flexGrow:1,maxWidth:"100%",overflowY:"auto"},children:e.jsx(Y,{compositionName:r.state.name,nodeId:"garment",graphId:r.state.graphId,selectPart:r.actions.selectPart,selectedPart:r.state.selectedPart})})}const qe=()=>{const t=u("Layout"),{SettingsPanel:n,Accordion:a}=t.components;return e.jsxs(n,{children:[e.jsx(a,{name:"Composição",icon:e.jsx(ae,{}),summary:"composição da peça",children:e.jsx(Ee,{})}),e.jsx(a,{name:"Sumário",icon:e.jsx(re,{}),summary:"Resumo da peça",children:e.jsx(e.Fragment,{})}),e.jsx(a,{name:"Valores",icon:e.jsx(ie,{}),summary:"Preço da peça",children:e.jsx(e.Fragment,{})}),e.jsx(a,{name:"Prazos",icon:e.jsx(z,{}),summary:"tempo de produção",children:e.jsx(e.Fragment,{})})]})},Ae=I.memo(qe),Le=({graphId:t,node:n})=>{const{components:{MaterialSelector:a}}=u("Materials"),l=u("Graph"),{useGraph:s}=l.hooks,i=M(t,r=>r),d=s(t,r=>r?.nodes[n.materialId]),c=p.useCallback(r=>i.actions.changeMaterial(n.id,r),[t,n.id]);return e.jsx(a,{type:n.materialType,value:d?.state?.materialId,onChange:c})},De=({node:t,graphId:n})=>{const a=u("Graph"),{components:{MaterialTypeSelector:l}}=u("Materials"),{useNodeInfo:s,useGraph:i,useSearch:d}=a.hooks,c=i(n,h=>h?.nodes[t.id]),r=p.useMemo(()=>`${t.id}/materialType/restrictions`,[t?.id]),o=d(n,r,()=>{t&&c.actions.search("bfs",t.id,(h,f)=>h.type!=="RESTRICTION"?!1:f.adjacencyList[h.id].inputs.some(y=>{const S=f.edges[y];return S.type==="RESTRICTED_BY"&&S.attr==="materialType"}),()=>!1,1,`Get all restriction associated with ${t.label}`,r)}),m=p.useMemo(()=>o?.findings.reduce((h,f)=>f.restrictionType==="allowOnly"?[...h,...f.operand]:h,[]),[o]),g=s(n,t.materialType),x=M(n,h=>h),j=p.useCallback(h=>x.actions.changeMaterialType(t.id,h.target.value),[n,t.id]);return e.jsx(l,{filter:h=>o?.findings.length?m?.includes(h.name):!0,value:g.node?.id,onChange:j})},$e=({graphId:t,nodeId:n})=>{const a=u("Graph"),{useNodeInfo:l}=a.hooks,{node:s}=l(t,n);return e.jsx($,{role:"material-info",children:e.jsx(F,{disableTypography:!0,primary:e.jsxs(C,{sx:{marginBottom:1},children:[e.jsx(w,{children:s.label}),e.jsx(U,{})]}),secondary:e.jsx(w,{component:"div",children:e.jsx(C,{sx:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:e.jsx(C,{sx:{gap:1,display:"flex",flexWrap:"wrap",flexDirection:"row"},role:"material-attributes","aria-label":"material attributes",children:s.editableAttributes.map(i=>{switch(i){case"materialType":return e.jsx(De,{graphId:t,node:s},i);case"materialId":return e.jsx(Le,{graphId:t,node:s},i);default:return e.jsx(e.Fragment,{children:"error"})}})})})})})})},Fe=({isOpen:t,labelState:[n,a],materialTypes:l,handleMaterialTypeChange:s})=>{const{components:{MaterialTypeSelector:i}}=u("Materials");return t?e.jsxs(C,{sx:{display:"flex",flexDirection:"column",flexGrow:2},children:[e.jsx(i,{value:l,onChange:s,multiple:!0}),e.jsx(R,{id:"material-usage-name",label:"Nome",variant:"standard",value:n,onChange:d=>a(d.target.value)})]}):e.jsx(e.Fragment,{})},Oe=({compositionName:t})=>{const n=u("Pointer"),{PointerContainer:a,ConfirmAndCloseButton:l}=n.components,s=M(t,g=>g?.selectedPart),[i,d]=p.useState(""),[c,r]=p.useState([]),o=p.useCallback(()=>{s.state&&s.actions.addMaterialUsage(i,s.state,c)},[i]),m=p.useCallback(g=>r(x=>g.target.value),[t]);return e.jsx(a,{component:e.jsx(Fe,{materialTypes:c,handleMaterialTypeChange:m,labelState:[i,d]}),actions:[e.jsx(l,{color:"success",handleConfirm:o},"accept")],children:e.jsx(G,{startIcon:e.jsx(A,{}),variant:"outlined",size:"small",sx:{marginBottom:1},children:"Adicionar material"})})},Be=({compositionName:t,materialUsageId:n})=>{const a=M(t,s=>s),l=p.useCallback(()=>{a.actions.removeMaterialUsage(n)},[a]);return e.jsx(P,{color:"error",id:"delete-material",onClick:l,sx:{flexGrow:2},children:e.jsx(L,{})},"delete")},_e=({compositionState:t,materialUsageId:n,isOpen:a})=>{const l=u("Graph"),s=u("Layout"),{useNodeInfo:i}=l.hooks,{CRUDGridContext:d}=s.contexts,{CRUDGrid:c,CRUDBooleanCell:r}=s.components,{node:o}=i(t.graphId,n),m=p.useMemo(()=>o.proxies.reduce((x,j)=>({...x,[j.elem]:{...x[j.elem],[j.attr]:!0}}),{}),[o]),{setRows:g}=p.useContext(d);return p.useEffect(()=>g(Object.entries(m).map(([x,j])=>({...j,elem:x,state:"untouched",id:k.uniqueId("proxy-")}))),[m]),a?e.jsxs(C,{role:"link-material-container",sx:{height:"max-content"},children:[e.jsx(w,{variant:"h4",children:"Elementos visuais vinculados"}),e.jsxs(w,{component:"div",children:[e.jsx("p",{children:"A tabela abaixo mostra os atuais elementos visuais vínculados com o material."}),e.jsx("p",{children:"Manipule a tabela para alterar os valores"})]}),e.jsx(c,{addLabel:"Adicionar vínculo",newRecord:()=>({id:k.uniqueId("proxy-"),stroke:!1,fill:!1}),columns:[{field:"elem",editable:!0,flex:1,width:100,minWidth:200,maxWidth:200,renderHeader:()=>"Elemento"},{field:"stroke",editable:!0,width:100,flex:1,minWidth:100,maxWidth:200,renderHeader:()=>"Contorno",renderCell:({value:x})=>e.jsx(V,{checked:x,disabled:!0}),renderEditCell:x=>e.jsx(r,{...x})},{field:"fill",editable:!0,width:100,flex:1,minWidth:100,maxWidth:200,renderHeader:()=>"Preenchimento",renderCell:({value:x})=>e.jsx(V,{checked:x,disabled:!0}),renderEditCell:x=>e.jsx(r,{...x})}]})]}):e.jsx(e.Fragment,{})},Ve=I.memo(_e),ze=({composition:t,materialUsageId:n,...a})=>{const l=u("Pointer"),s=u("Layout"),{ConfirmAndCloseButton:i}=l.components,{CRUDGridContext:d}=s.contexts,{rows:c}=p.useContext(d),r=p.useCallback(()=>{c.filter(o=>o.state==="deleted").forEach(o=>t.actions.deleteProxy(o.elem,n)),c.filter(o=>o.state==="modified").forEach(o=>{t.actions.deleteProxy(o.old.elem,n),o.stroke&&t.actions.addProxy({elem:o.elem,attr:"stroke"},n),o.fill&&t.actions.addProxy({elem:o.elem,attr:"fill"},n)}),c.filter(o=>o.state==="added").forEach(o=>{t.actions.deleteProxy(o.elem,n),o.stroke&&t.actions.addProxy({elem:o.elem,attr:"stroke"},n),o.fill&&t.actions.addProxy({elem:o.elem,attr:"fill"},n)})},[c]);return e.jsx(i,{color:"success",...a,handleConfirm:r})},Ue=({compositionName:t,materialUsageId:n})=>{const a=M(t,c=>c),l=u("Pointer"),s=u("Layout"),{PointerContainer:i}=l.components,{CRUDGridProvider:d}=s.components;return a.state?e.jsx(d,{initialRows:[],children:e.jsx(i,{component:e.jsx(Ve,{compositionState:a.state,materialUsageId:n}),actions:[e.jsx(ze,{composition:a,materialUsageId:n},"accept")],children:e.jsx(P,{id:"configure-material",sx:{flexGrow:2},children:e.jsx(le,{})},"configure")})}):e.jsx(e.Fragment,{})};function Ne({node:t}){switch(t.restrictionType){case"allowOnly":return e.jsx(e.Fragment,{children:t.operand.join(",")});case"sameAs":return e.jsx(e.Fragment,{children:t.operand});default:return e.jsx(e.Fragment,{})}}function We({row:t,...n}){const{components:{CRUDMaterialTypeCell:a}}=u("Materials");switch(t.attribute){case"materialType":return e.jsx(a,{row:t,value:t.operand,...n,multiple:t.restrictionType==="allowOnly"});default:return e.jsx(e.Fragment,{})}}const He=({compositionState:t,materialUsageId:n})=>{const a=u("Graph"),l=u("Layout"),{useGraph:s,useSearch:i}=a.hooks,{CRUDGridContext:d}=l.contexts,{CRUDGrid:c}=l.components,{state:r,actions:{search:o}}=s(t.graphId,h=>h?.nodes[n]),m=p.useMemo(()=>`${n}/restrictions`,[n]),g=i(t.graphId,m,()=>{r&&o("bfs",r.id,(h,f)=>h.type!=="RESTRICTION"?!1:f.adjacencyList[h.id].inputs.some(y=>f.edges[y].type==="RESTRICTED_BY"),()=>!1,1,`Get all restriction associated with ${r?.label??r.id}`,m)}),{setRows:x}=p.useContext(d);p.useEffect(()=>{g?.findings&&x(g.findings.map(h=>({...h,state:"untouched"})))},[g]),p.useEffect(()=>{g?.findings&&x(g.findings)},[]);const j=[{field:"label",editable:!0,flex:1,width:100,minWidth:200,maxWidth:400,renderHeader:()=>"Restrição"},{field:"attribute",editable:!0,flex:1,width:100,minWidth:200,maxWidth:400,renderHeader:()=>"Atributo",renderCell:({value:h})=>e.jsx(e.Fragment,{children:h})},{field:"restrictionType",editable:!0,flex:1,width:100,minWidth:200,maxWidth:400,renderHeader:()=>"Operador"},{field:"operand",editable:!0,flex:1,width:100,minWidth:200,maxWidth:400,renderHeader:()=>"Operando",renderCell:({row:h})=>e.jsx(Ne,{node:h}),renderEditCell:h=>e.jsx(We,{...h})}];return e.jsxs(C,{role:"restrictions-management-container",children:[e.jsx(w,{variant:"h4",children:"Restrições do material"}),e.jsxs(w,{component:"div",children:[e.jsx("p",{children:"A tabela abaixo mostra as atuais restrições para este material."}),e.jsxs("p",{children:["Quando essas condições são quebradas o modelo é considerado"," ",e.jsx("strong",{children:"inválido"}),"."]})]}),e.jsx(c,{addLabel:"Adicionar restrição",newRecord:()=>({id:k.uniqueId("hard-restriction-"),label:"Nova restricao",operand:[],restrictionType:"allowOnly",attribute:"materialType"}),columns:j})]})},Ye=t=>t.isOpen?e.jsx(C,{role:"add-restriction-container",sx:{height:"max-content",display:"flex",gap:2,justifyContent:"space-between",flexDirection:"column",padding:1},children:e.jsx(He,{...t})}):e.jsx("div",{}),Ze=({composition:t,materialUsageId:n,...a})=>{const l=u("Pointer"),s=u("Layout"),{ConfirmAndCloseButton:i}=l.components,{CRUDGridContext:d}=s.contexts,{rows:c}=p.useContext(d),r=p.useCallback(()=>{console.group("delete"),c.filter(o=>o.state==="deleted").forEach(o=>t.actions.removeRestriction(n,o.id)),console.groupEnd(),console.group("modified"),c.filter(o=>o.state==="modified").forEach(o=>{t.actions.updateRestriction(n,o.id,o)}),console.groupEnd(),console.group("added"),c.filter(o=>o.state==="added").forEach(o=>{t.actions.addRestriction(n,{type:"RESTRICTION",id:o.id,label:o.label,operand:o.operand,position:o.position,restrictionType:o.restrictionType,attribute:o.attribute})}),console.groupEnd()},[c]);return e.jsx(i,{color:"success",...a,handleConfirm:r})},Qe=({sx:t,materialUsageId:n,compositionName:a,...l})=>{const s=M(a,o=>o),i=u("Pointer"),d=u("Layout"),{PointerContainer:c}=i.components,{CRUDGridProvider:r}=d.components;return s.state?e.jsx(r,{initialRows:[],children:e.jsx(c,{component:e.jsx(Ye,{compositionState:s.state,materialUsageId:n}),actions:[e.jsx(Ze,{composition:s,materialUsageId:n},"accept")],children:e.jsx(P,{id:"restrict-material",sx:{flexGrow:2},children:e.jsx(ce,{})},"restrict")})}):e.jsx(e.Fragment,{})},Je=t=>e.jsxs(C,{sx:{display:"flex",flexDirection:"column",padding:0,justifyContent:"space-around",alignContent:"space-evenly"},role:"actions",children:[e.jsx(Be,{...t}),e.jsx(Ue,{...t}),e.jsx(Qe,{...t,sx:{hover:{fill:"yellow"}}})]});function Ke({compositionName:t,selectedPart:n,graphId:a}){const l=u("Graph"),{useNodeInfo:s}=l.hooks,{edges:i}=s(a,n);return e.jsxs(O,{sx:{width:"100%"},role:"material-list",children:[e.jsx(Oe,{compositionName:t}),Object.values(i).filter(d=>d.type==="MADE_OF").map(d=>e.jsxs(T,{variant:"outlined",square:!0,sx:{width:"100%",padding:1,"&:div + div":{borderTop:0},display:"flex"},role:"material-container",children:[e.jsx($e,{graphId:a,nodeId:d.targetId}),e.jsx(Je,{compositionName:t,materialUsageId:d.targetId})]},d.targetId))]})}const Xe=({graphId:t,nodeId:n})=>{const a=u("Graph"),{useNodeInfo:l}=a.hooks,{node:s}=l(t,n);return e.jsx($,{children:e.jsx(F,{disableTypography:!0,primary:e.jsxs(C,{sx:{marginBottom:1},children:[e.jsx(w,{children:s.label}),e.jsx(U,{})]}),secondary:e.jsx(w,{component:"div",sx:{padding:1},children:e.jsxs(C,{sx:{display:"flex",justifyContent:"space-between"},role:"material-attributes","aria-label":"material attributes",children:[e.jsxs(C,{sx:{display:"flex",gap:.3,alignItems:"center"},children:[e.jsx(z,{})," ",s.time_taken.quotient.amount," ",s.time_taken.quotient.unit," /"," ",s.time_taken.dividend.amount," ",s.time_taken.dividend.unit]}),e.jsxs(C,{sx:{display:"flex",gap:.3,alignItems:"center"},children:[e.jsx(de,{})," ",s.cost.quotient.amount," ",s.cost.quotient.unit," / ",s.cost.dividend.amount," ",s.cost.dividend.unit]})]})})})})},et=({compositionName:t})=>{const n=u("Pointer"),a=u("Converter"),{PointerContainer:l,ConfirmAndCloseButton:s}=n.components,{CompoundSelector:i}=a.components,{useScales:d}=a.hooks,c=d(),r=M(t,j=>j?.selectedPart),o=p.useMemo(()=>k.uniqueId("new-process-form"),[]),[m,g]=p.useState({label:"",cost:{quotient:{amount:1,unit:"R$"},dividend:{amount:1,unit:"un"}},time_taken:{quotient:{amount:1,unit:"m"},dividend:{amount:1,unit:"un"}}}),x=p.useCallback(j=>{j.preventDefault(),j.stopPropagation(),r.state&&r.actions.addOperation(m.label,m.cost,m.time_taken,r.state)},[m]);return e.jsx(l,{component:e.jsxs(C,{component:"form",onSubmit:x,id:o,sx:{display:"flex",flexDirection:"column",flexGrow:2,gap:1},children:[e.jsx(N,{children:e.jsx(R,{id:"name",label:"Nome",variant:"standard",sx:{marginBottom:1},onChange:j=>g(h=>({...h,label:j.target.value})),value:m.label})}),e.jsx(i,{id:"time-taken",label:"Tempo",quotientUnitsAvailable:()=>c.time,dividendUnitsAvailable:()=>[{value:"un",label:"Un"}],value:m.time_taken,onChange:j=>g(h=>({...h,time_taken:j}))}),e.jsx(i,{id:"cost",label:"Custo",quotientUnitsAvailable:()=>[{value:"R$",label:"R$"},{value:"$",label:"USD"}],dividendUnitsAvailable:()=>[{value:"un",label:"Un"}],value:m.cost,onChange:j=>g(h=>({...h,cost:j}))})]}),actions:[e.jsx(s,{type:"submit",form:o,value:"Submit",color:"success",handleConfirm:()=>null},"accept")],children:e.jsx(G,{startIcon:e.jsx(A,{}),variant:"outlined",size:"small",sx:{marginBottom:1},children:"Adicionar processo"})})},tt=({compositionName:t,processId:n})=>{const a=M(t,s=>s),l=p.useCallback(()=>{a.actions.removeOperation(n)},[a]);return e.jsx(P,{color:"error",id:`delete-process-${n}`,onClick:l,sx:{flexGrow:2},children:e.jsx(L,{})},"delete")},nt=({id:t,field:n,graphId:a,partId:l,value:s})=>{const i=u("Graph"),{useGraph:d}=i.hooks,c=W(),r=x=>Object.values(x).filter(j=>j.type==="MADE_OF"&&j.sourceId===l),o=(x,j)=>Object.entries(x).reduce((h,[f,v])=>j.includes(f)?{...h,[f]:v}:h,{}),{state:m}=d(a,x=>x&&{edges:r(x.edges),nodes:o(x.nodes,r(x.edges).map(j=>j.targetId))}),g=p.useCallback(x=>{c.current.setEditCellValue({id:t,field:n,value:x.target.value})},[a,l]);return m?e.jsxs(N,{sx:{m:1,minWidth:120,width:"min-content"},size:"small",children:[e.jsx(ue,{id:"label",children:"Material"}),e.jsx(me,{labelId:"label",id:"material-type",value:s??"",label:"Material",autoWidth:!0,onChange:g,children:m.edges.map(x=>e.jsx(H,{value:x.targetId,children:m.nodes[x.targetId].label},x.id))})]}):e.jsx(e.Fragment,{})};function st({row:t,id:n,field:a}){const l=W(),s=u("Converter"),{components:{CompoundSelector:i}}=s,d=p.useCallback(c=>{l.current.setEditCellValue({id:n,field:a,value:c})},[n]);return e.jsx(i,{id:"quantity",quotientUnitsAvailable:()=>[{value:"cm",label:"cm"},{value:"m",label:"m"},{value:"cm2",label:"cm²"},{value:"m2",label:"m²"},{value:"cm3",label:"cm³"},{value:"m3",label:"m³"},{value:"ml",label:"ml"},{value:"l",label:"l"}],dividendUnitsAvailable:()=>[{value:"un",label:"Un"}],value:t.quantity,onChange:d})}const ot=({compositionState:t,processId:n})=>{const a=u("Graph"),l=u("Layout"),s=u("Converter"),{useGraph:i}=a.hooks,{CRUDGridContext:d}=l.contexts,{CRUDGrid:c}=l.components,{components:{CompoundUnit:r}}=s,o=f=>Object.values(f).filter(v=>v.type==="MADE_OF"&&v.sourceId===t.selectedPart),m=(f,v)=>Object.entries(f).reduce((b,[y,S])=>v.includes(y)?{...b,[y]:S}:b,{}),{state:g}=i(t.graphId,f=>f&&{edges:o(f.edges),nodes:m(f.nodes,o(f.edges).map(v=>v.targetId))}),{state:x}=i(t.graphId,f=>f?.edges&&Object.values(f.edges).filter(v=>v.type==="CONSUMES"&&v.sourceId===n)),{setRows:j}=p.useContext(d);if(p.useEffect(()=>{x?.length&&j(x.map(f=>({...f,state:"untouched"})))},x),!g)return e.jsx(e.Fragment,{});const h=[{field:"targetId",editable:!0,flex:2,minWidth:200,renderCell:({row:{targetId:f},value:v})=>e.jsx(e.Fragment,{children:g.nodes[f]?.label}),renderEditCell:({value:f,...v})=>e.jsx(nt,{value:f??v.row.targetId,partId:t.selectedPart,graphId:t.graphId,...v}),renderHeader:()=>"Material"},{field:"quantity",editable:!0,flex:2,width:800,minWidth:400,align:"center",headerAlign:"center",renderHeader:()=>"Quantidade",renderCell:({row:{quantity:f}})=>e.jsx(r,{value:f}),renderEditCell:f=>e.jsx(st,{...f})}];return e.jsxs(C,{role:"material-usage-management-container",children:[e.jsx(w,{variant:"h4",children:"Materiais consumidos"}),e.jsxs(w,{component:"div",children:[e.jsx("p",{children:"A tabela abaixo mostra os materiais utilizados neste processo."}),e.jsx("p",{children:"Essas informações são utilizadas para calcular o custo em tempo e dinheiro da peça."})]}),e.jsx(c,{addLabel:"Víncular material",newRecord:()=>({id:k.uniqueId("material-usage-"),type:"CONSUMES",sourceId:n,targedId:"",quantity:{quotient:{amount:1,unit:"cm2"},dividend:{amount:1,unit:"un"}}}),columns:h})]})},at=t=>t.isOpen?e.jsx(C,{role:"material-usage-container",sx:{height:"max-content",display:"flex",gap:2,justifyContent:"space-between",flexDirection:"column",padding:1},children:e.jsx(ot,{...t})}):e.jsx("div",{}),rt=({composition:t,processId:n,...a})=>{const l=u("Pointer"),s=u("Layout"),{ConfirmAndCloseButton:i}=l.components,{CRUDGridContext:d}=s.contexts,{rows:c}=p.useContext(d),r=p.useCallback(()=>{c.filter(o=>o.state==="deleted").forEach(o=>{t.actions.deleteMaterialConsuption(o.id)}),c.filter(o=>o.state==="modified").forEach(({id:o,targetId:m,quantity:g})=>{t.actions.updateMaterialConsuption(o,{targetId:m,quantity:g})}),c.filter(o=>o.state==="added").forEach(o=>{t.actions.addMaterialConsuption(n,o.targetId,o.quantity)})},[c]);return e.jsx(i,{color:"success",...a,handleConfirm:r})},it=({sx:t,compositionName:n,processId:a,...l})=>{const s=M(n,o=>o),i=u("Pointer"),d=u("Layout"),{PointerContainer:c}=i.components,{CRUDGridProvider:r}=d.components;return s.state?e.jsx(r,{initialRows:[],children:e.jsx(c,{component:e.jsx(at,{processId:a,compositionState:s.state}),actions:[e.jsx(rt,{composition:s,processId:a},"accept")],children:e.jsx(P,{color:"default",id:"configure-process",sx:{flexGrow:2},children:e.jsx(pe,{})},"configure")})}):e.jsx(e.Fragment,{})},lt=t=>e.jsxs(C,{sx:{display:"flex",flexDirection:"column",padding:0,justifyContent:"space-around",alignContent:"space-evenly"},role:"actions",children:[e.jsx(tt,{...t}),e.jsx(it,{...t})]});function ct({compositionName:t,selectedPart:n,graphId:a}){const l=u("Graph"),{useNodeInfo:s}=l.hooks,{edges:i}=s(a,n);return e.jsxs(O,{sx:{width:"100%"},role:"processes-list",children:[e.jsx(et,{compositionName:t}),Object.values(i).filter(d=>d.type==="PROCESS_NEEDED").map(d=>e.jsxs(T,{variant:"outlined",square:!0,sx:{width:"100%",padding:1,"&:div + div":{borderTop:0},display:"flex"},role:"process-container",children:[e.jsx(Xe,{graphId:a,nodeId:d.targetId}),e.jsx(lt,{compositionName:t,processId:d.targetId})]},d.targetId))]})}const dt=({graphId:t})=>{const n=u("Layout"),a=u("Store"),{useAppSelector:l}=a.hooks,{selectActiveViewport:s}=n.store.selectors,i=l(s),d=p.useCallback(r=>({name:r?.name,graphId:r?.graphId,selectedPart:r?.selectedPart}),[]),c=M(i,d);return!c.state?.selectedPart||!c.state?.graphId||!c.state?.name?null:e.jsx(ut,{graphId:c.state.graphId,selectedPart:c.state.selectedPart,compositionName:c.state.name})},ut=({graphId:t,selectedPart:n,compositionName:a})=>{const l=u("Layout"),s=u("Graph"),{DetailsPanel:i,Accordion:d}=l.components,{useGraph:c}=s.hooks,r=c(t,o=>o?.nodes[n]);return e.jsxs(i,{title:r.state?.label??n,children:[e.jsx(d,{name:"Opcionais",icon:e.jsx(E,{}),summary:"Lista de opcionais",sx:{flexGrow:1},children:e.jsx(e.Fragment,{})}),e.jsx(d,{name:"Materiais",icon:e.jsx(E,{}),summary:"Lista de materiais",sx:{flexGrow:1},children:e.jsx(Ke,{graphId:t,selectedPart:n,compositionName:a})}),e.jsx(d,{name:"Processos",icon:e.jsx(E,{}),summary:"Lista de processos",sx:{flexGrow:1},children:e.jsx(ct,{graphId:t,selectedPart:n,compositionName:a})})]})},mt=I.memo(dt),q=["Adicionar ao orçamento","Criar orçamento"];function pt(){const[t,n]=p.useState(!1),a=p.useRef(null),[l,s]=p.useState(1),i=()=>{console.info(`You clicked ${q[l]}`)},d=(o,m)=>{s(m),n(!1)},c=()=>{n(o=>!o)},r=o=>{a.current&&a.current.contains(o.target)||n(!1)};return e.jsxs(p.Fragment,{children:[e.jsxs(xe,{variant:"contained",ref:a,"aria-label":"split button",children:[e.jsx(G,{onClick:i,children:q[l]}),e.jsx(G,{size:"small","aria-controls":t?"split-button-menu":void 0,"aria-expanded":t?"true":void 0,"aria-label":"select merge strategy","aria-haspopup":"menu",onClick:c,children:e.jsx(he,{})})]}),e.jsx(fe,{sx:{zIndex:1},open:t,anchorEl:a.current,role:void 0,transition:!0,disablePortal:!0,children:({TransitionProps:o,placement:m})=>e.jsx(je,{...o,style:{transformOrigin:m==="bottom"?"center top":"center bottom"},children:e.jsx(T,{children:e.jsx(ge,{onClickAway:r,children:e.jsx(Ce,{id:"split-button-menu",autoFocusItem:!0,children:q.map((g,x)=>e.jsx(H,{disabled:x===2,selected:x===l,onClick:j=>d(j,x),children:g},g))})})})})})]})}const xt=()=>e.jsx(C,{sx:{position:"absolute",bottom:10,right:10},children:e.jsx(pt,{})}),ht=I.memo(xt),wt=()=>{const t=u("Store"),n=u("Layout"),{useAppSelector:a}=t.hooks,{selectActiveViewport:l}=n.store.selectors,s=a(l),i=p.useCallback(c=>c,[s]),d=M(s,i);return!s||!d.state?null:e.jsx(ft,{selectPart:d.actions.selectPart,compositionInfo:d.state})},ft=({compositionInfo:t,selectPart:n})=>{const{components:{SVGViewer:a},hooks:{useSVG:l}}=u("SVG"),{components:{MultiTouchPanel:s}}=u("Pointer"),{hooks:{useGraph:i}}=u("Graph"),d=u("Layout"),{ViewportNotificationsTray:c}=d.components,{graphId:r,svgPath:o,name:m,viewportName:g}=t,x=B(),j=i(r,b=>b?.nodes),h=l(o,b=>b?.instances[m]),f=p.useCallback(b=>{j.state&&Object.values(j.state).filter(y=>y.type==="PART").forEach(y=>{if(y.domId){const[S]=[...b?.querySelectorAll(`#${y.domId}`)];S.addEventListener("click",Z=>{Z.stopPropagation(),n(y.id)})}})},[r]),v=p.useCallback(()=>{x.functions.createDebugView(m,g)},[]);return e.jsxs(e.Fragment,{children:[e.jsxs(C,{role:"composer-viewport",sx:{padding:1,height:"100%",position:"relative",cursor:"crosshair",overflow:"hidden"},children:[e.jsx(s,{gestures:{onPinch:b=>{h.actions.setZoom(m,b.offset[0])},onWheel:b=>{const y=h.state?.zoom??1;h.actions.setZoom(m,y+b.delta[1]*.001)}},children:e.jsx(a,{instanceName:m,path:o,beforeInjection:f})}),e.jsx(c,{children:e.jsx(ve,{fontSize:"small",onClick:v,sx:{":hover":{cursor:"pointer",color:"primary.main"}}})}),e.jsx(Ae,{}),e.jsx(mt,{graphId:r})]}),e.jsx(ht,{})]})},jt=({instanceName:t,path:n,...a})=>{const l=u("SVG"),{components:{SVGViewer:s},hooks:{useSVGManager:i}}=l,d=i();return p.useLayoutEffect(()=>{d.functions.loadSVG(n,`${t}-preview`)},[]),e.jsx(s,{...a,instanceName:`${t}-preview`,path:n})},gt=be(C)`
  display: flex;
  flex-direction: row;
  max-height: 85vh;

  @media (orientation: portrait) {
    flex-direction: column;
  }
`,Ct=({closeModal:t,onModelSelection:n})=>{const a=u("Markdown"),{components:{MarkdownReader:l}}=a,s=Me(),[i,d]=p.useState(void 0);return e.jsx(T,{elevation:6,id:"open-model-modal",sx:{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%, -50%)",bgcolor:"background.paper",width:"85vw",overflow:"hidden",maxHeight:"85vh",p:2},children:e.jsxs(gt,{role:"model-selector-container",sx:{gap:1},children:[e.jsx(O,{role:"list-options",sx:{paddingRight:5,overflow:"auto"},children:s.map(c=>e.jsx($,{disableGutters:!0,children:e.jsx(F,{primary:c.name,secondary:null,id:c.name,color:i?.name===c.name?"primary":"secondary",onClick:()=>d({name:c.name,path:c.svgPath,descriptionPath:c.descriptionPath}),sx:{cursor:"pointer",flexGrow:1}})},k.uniqueId()))}),e.jsxs(C,{sx:{overflow:"auto",width:"100%"},children:[i?e.jsx(jt,{instanceName:i.name,path:i.path,sx:{gridArea:"preview",p:1}}):e.jsx(C,{sx:{p:1,display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("span",{children:"Selecione um modelo"})}),i?.descriptionPath&&e.jsx(C,{role:"model-description",sx:{flexGrow:1,p:1,gridArea:"description",overflowY:"auto",height:"min-content"},children:e.jsx(l,{path:i.descriptionPath})})]}),e.jsx(C,{role:"actions",sx:{position:"absolute",top:10,right:10,display:"flex",flexDirection:"row-reverse"},children:e.jsx(G,{disabled:!i,variant:"contained",onClick:()=>{i&&(n(i.name,i.path),t?.())},children:"Selecionar"})})]})})},Pt=()=>{const t=B(),n=u("Layout"),{SystemModal:a}=n.components,l=p.useCallback((s,i)=>{t.functions.createComposition(s,i)},[]);return e.jsx(e.Fragment,{children:e.jsx(a,{component:e.jsx(Ct,{onModelSelection:l}),children:e.jsx(P,{children:e.jsx(ye,{})})})})},vt=({name:t})=>{const n=u("Graph"),a=u("Layout"),{ViewportNotificationsTray:l,DetailsPanel:s,SettingsPanel:i,Accordion:d}=a.components,{components:{GraphViewer:c}}=n,r=B(),o=p.useMemo(()=>r.functions.findComposition(m=>m.debugViewport===t),[t]);return e.jsxs(C,{role:"composer-debugger-viewport",sx:{padding:1,height:"100%",position:"relative",overflow:"hidden"},children:[o&&e.jsx(c,{graphId:o?.graphId}),e.jsx(l,{children:e.jsx(e.Fragment,{})}),e.jsxs(i,{title:"Configurações",children:[e.jsx(d,{name:"Tipos de nodos",summary:"Tipos de nodos disponiveis",children:e.jsx(e.Fragment,{})}),e.jsx(e.Fragment,{})]}),e.jsx(s,{children:e.jsx(e.Fragment,{})})]})},St=I.memo(vt);export{wt as C,St as D,Pt as M};
