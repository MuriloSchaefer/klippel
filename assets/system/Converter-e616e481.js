import{c as P,d as pe,b as me,_ as X,o as e,B as y,aZ as F,a_ as he,a$ as q,b0 as S,r as v,aD as N,aT as se,aX as xe,aS as ge,aO as fe,R as A,n as ve,ba as je,P as be,I as U,bb as ye,bc as Ce,bd as Se,be as Me,e as Ne,T as ae,bf as w,bg as oe}from"../vendor-4a2caf03.js";import{A as $,n as h,o as Ie,l as we}from"../kernel-7bfe83e7.js";const I="Converter",Le="0.0.1",L="conversion-graph",Te={week:"Semana",day:"Dia",h:"H",m:"m",s:"s",ms:"ms"},ke={selectedNode:void 0},re=P(`[${I}:${$.COMMAND}] Load conversion graph`),z=P(`[${I}:${$.COMMAND}] Select node`),Ae=P(`[${I}:${$.EVENT}] Conversion graph loaded`),Ge=P(`[${I}:${$.COMMAND}] Node selected`),Ee=pe({name:I,initialState:ke,reducers:{},extraReducers:t=>{t.addCase(z,(n,{payload:s})=>({...n,selectedNode:s}))}}),J=t=>t.Converter,G=t=>{const n=h("Store"),s=h("Graph"),i=h("Layout"),{useGraph:a}=s.hooks,o=a(L,x=>x),l=i.hooks.usePanelsManager(),{useAppDispatch:r,useAppSelector:d}=n.hooks,u=r(),c=me(J,t),E=d(c);return d(J),{state:E,selectNode:x=>{u(z(x)),l.functions.openDetails()},addUnit:(x,T,M)=>{const g=X.uniqueId(x.toLowerCase().replace(" ",""));o.actions.addNode({type:"UNIT",id:g,name:x,position:{x:0,y:0},abbreviation:T}),console.log(M),M&&(console.log("add scale"),o.actions.addEdge({id:`${g} -> ${M}`,type:"BELONGS_TO",sourceId:g,targetId:M}))},updateUnit:(x,T,M,g)=>{o.actions.updateNode({id:x,name:T,abbreviation:M});const j=o.state?.adjacencyList[x].outputs.filter(k=>o.state?.edges[k].type==="BELONGS_TO").map(k=>o.state?.edges[k]).pop();g?(j&&j.targetId!==g&&o.actions.removeEdge(j.id),o.actions.addEdge({id:`${x} -> ${g}`,type:"BELONGS_TO",sourceId:x,targetId:g})):j&&o.actions.removeEdge(j.id)},addScale:x=>{o.actions.addNode({type:"SCALE",id:X.uniqueId(x.toLowerCase().replace(" ","")),name:x,position:{x:0,y:0}})}}};function ie({onChange:t,value:n,...s}){const i=h("Graph"),{hooks:{useGraph:a}}=i,o=a(L,l=>l&&Object.values(l.nodes).filter(r=>r.type==="SCALE"));return o.state?e.jsx(y,{role:"scale-selector",...s,sx:{display:"flex",gap:.2},children:e.jsxs(F,{sx:{m:1,minWidth:120,width:"min-content"},children:[e.jsx(he,{id:"label",children:"Escala"}),e.jsxs(q,{id:"scale-selector",inputProps:{id:"scale"},label:"Escala",labelId:"label",size:"small",onChange:l=>t(l.target.value),value:n??"",children:[o.state.map(l=>e.jsx(S,{value:l.id,children:l.name})),e.jsx(S,{value:"",children:"Nenhuma"})]})]})}):e.jsx(e.Fragment,{})}const K={name:void 0,abbreviation:void 0,scale:void 0},Oe=()=>{const t=h("Pointer"),{PointerContainer:n,ConfirmAndCloseButton:s}=t.components,i=G(r=>r),[a,o]=v.useState(K),l=v.useCallback(()=>{!a.name||!a.abbreviation||(i.addUnit(a.name,a.abbreviation,a.scale),o(K))},[a,i]);return e.jsx(n,{component:e.jsxs(y,{sx:{display:"flex",flexDirection:"column",gap:1},children:[e.jsx(N,{id:"unit-name",label:"Nome",variant:"standard",value:a.name,onChange:r=>o(d=>({...d,name:r.target.value}))}),e.jsx(N,{id:"abbreviation",label:"Abbreviation",variant:"standard",value:a.abbreviation,onChange:r=>o(d=>({...d,abbreviation:r.target.value})),sx:{alignItems:"center"}}),e.jsx(ie,{value:a.scale??"",onChange:r=>o(d=>({...d,scale:r}))})]}),actions:[e.jsx(s,{handleConfirm:l},"confirm")],children:e.jsx(se,{primary:"Unidade",secondary:"Adiciona um tipo de unidade simples",sx:{cursor:"pointer",flexGrow:1}})})},ee={name:void 0},Pe=()=>{const t=h("Pointer"),{PointerContainer:n,ConfirmAndCloseButton:s}=t.components,i=G(r=>r),[a,o]=v.useState(ee),l=v.useCallback(()=>{a.name&&(i.addScale(a.name),o(ee))},[a,i]);return e.jsx(n,{component:e.jsx(y,{sx:{display:"flex",flexDirection:"column",gap:1},children:e.jsx(N,{id:"part-name",label:"Nome",variant:"standard",value:a.name,onChange:r=>o(d=>({...d,name:r.target.value}))})}),actions:[e.jsx(s,{handleConfirm:l},"confirm")],children:e.jsx(se,{primary:"Escala",secondary:"Adiciona um tipo de escala",sx:{cursor:"pointer",flexGrow:1}})})},$e=()=>{const t=[{key:"unit",component:e.jsx(Oe,{})},{key:"scale",component:e.jsx(Pe,{})}];return e.jsx(xe,{role:"list-options",sx:{paddingRight:5,overflow:"auto"},children:t.map(({key:n,component:s})=>e.jsx(ge,{disableGutters:!0,children:s},n))})},_e=()=>{const t=h("Layout"),{SettingsPanel:n,Accordion:s}=t.components;return e.jsxs(n,{children:[e.jsx(s,{name:"Nodos",icon:e.jsx(fe,{}),summary:"Tipos de nodos disponíveis",children:e.jsx($e,{})}),e.jsx(e.Fragment,{})]})},De=({graphId:t})=>{const{hooks:{useResizeObserver:n}}=h("Layout"),{hooks:{useGraph:s}}=h("Graph"),{hooks:{useD3Container:i},d3Components:{Grid:a,DependencyCircle:o}}=h("SVG"),l=G(p=>p),r=v.useRef(null),d=v.useRef(null),u=n(d),c=s(t,p=>p),E=v.useMemo(()=>{if(!c.state?.nodes)return{nodes:[],links:[]};const p=m=>{if(!c.state)return"Outros";const C=Object.values(c.state.edges).find(b=>b.sourceId===m.id&&b.type==="BELONGS_TO");return C?c.state.nodes[C.targetId].name:"Outros"};return{nodes:Object.values(c.state.nodes).map(m=>({...m,nodeLabel:"abbreviation"in m?m.abbreviation:m.name,group:p(m),radius:5,strength:10,x:m.position.x,y:m.position.y})),links:Object.values(c.state.edges).map(m=>({...m,source:m.sourceId,target:m.targetId}))}},[c]),x=ve(),[T,M]=v.useState(!0),[g,j]=[u?.width??700,u?.height??700],k=v.useCallback(p=>{l.selectNode(p)},[]),W=v.useCallback(p=>{l.selectNode(p)},[]),ue=i().width(g).height(j).underlays([a({xSettings:{range:[-1,g+1],domain:[-1,g+1]},ySettings:{range:[-1,j+1],domain:[-1,j+1]},dimensions:[g,j]}).transformZoom((p,m)=>{T&&(m.translateBy(p,g/2,j/2),M(!1))}).build]).content([o().innerRadius(Math.min(g,j)/2-20).filterNode(p=>p.type==="UNIT"||p.type==="COMPOUND_UNIT").filterLink(p=>p.type==="CONVERTS_TO").renderGroup((p,m,C,b,O,Y)=>{p.selectAll("path").data([m]).join("path").attr("id",f=>f.name).on("click",f=>W(f.target.id)).attr("class","group-arc").attr("fill",f=>b(m.name)).attr("d",(f,Z)=>O(C)),p.selectAll("text").data([m]).join("text").attr("class","group-text").text(f=>f.name).attr("id",f=>f.name).on("click",f=>W(f.target.id)).attr("fill",f=>b(f.name)).attr("text-anchor",(f,Z)=>(C.endAngle+C.startAngle)/2>Math.PI?"end":"start").attr("transform",(f,Z)=>{const[_,D]=O.centroid(C),Q=Math.sqrt(_*_+D*D);return`translate(${_/Q*Y*1.3}, ${D/Q*Y*1.3})`})}).renderNode((p,m,C)=>{p.append("text").text(b=>b.nodeLabel).attr("fill",b=>l.state?.selectedNode===b.id?"white":C(b.group)).attr("text-anchor","middle").on("pointerdown",(b,O)=>{k(O.id),b.stopPropagation()})}).theme(x.palette.mode).build]);return v.useLayoutEffect(()=>{!u||!r.current||ue.render(E,r.current)},[E,u]),c.state?e.jsx("div",{ref:d,role:"conversion-graph-viewer",style:{height:"100%",width:"100%"},children:e.jsx("svg",{ref:r,id:`${c.id}`,width:"100%",height:"100%"})}):e.jsx(e.Fragment,{})},Ve=A.memo(De),Re=()=>{const t=h("Layout"),{Accordion:n}=t.components,s=h("Graph"),{useGraph:i}=s.hooks,a=G(u=>u.selectedNode),o=i(L,u=>a.state&&u?.nodes?{...u.nodes[a.state],scale:u.adjacencyList[a.state].outputs.filter(c=>u.edges[c].type==="BELONGS_TO").map(c=>u.edges[c].targetId).pop()}:void 0),[l,r]=v.useState(o.state);v.useEffect(()=>r(o.state),[a.state]);const d=v.useCallback(()=>{a.updateUnit(a.state,l?.name,l?.abbreviation,l?.scale)},[o]);return!a?.state||!o?.state?e.jsx(e.Fragment,{}):e.jsx(n,{name:"Propriedades",icon:e.jsx(je,{}),summary:"Propriedades da unidade",children:e.jsxs(be,{variant:"outlined",square:!0,sx:{width:"100%",padding:1,"&:div + div":{borderTop:0},display:"flex",justifyContent:"space-between"},role:"unit-properties",children:[e.jsx(N,{id:"unit-name",label:"Nome",variant:"standard",value:l?.name??"",onChange:u=>r(c=>c&&{...c,name:u.target.value})}),e.jsx(N,{id:"abbreviation",label:"Abreviatura",variant:"standard",value:l?.abbreviation??"",onChange:u=>r(c=>c&&{...c,abbreviation:u.target.value}),sx:{alignItems:"center"}}),e.jsx(ie,{value:l?.scale??"",onChange:u=>r(c=>c&&{...c,scale:u})}),e.jsxs(y,{sx:{display:"flex",flexDirection:"column",padding:0,gap:1,justifyContent:"space-between",alignContent:"space-evenly"},role:"actions",children:[e.jsx(U,{color:"success",id:"save-unit-properties",onClick:u=>d(),children:e.jsx(ye,{})},"save"),e.jsx(U,{color:"info",id:"reset-unit-properties",onClick:u=>r(o.state),children:e.jsx(Ce,{})},"reset")]})]})})},Fe=()=>{const t=h("Layout");h("Graph").hooks;const s=G(a=>a.selectedNode),{Accordion:i}=t.components;return e.jsx(i,{name:"Converte de",icon:e.jsx(Se,{}),summary:`Quais unidades podem ser convertidas em ${s.state}`,children:e.jsx(e.Fragment,{})})},Ue=()=>(h("Layout").components,e.jsxs(e.Fragment,{children:[e.jsx(Re,{}),e.jsx(Fe,{})]})),Be=()=>{const t=h("Layout"),{DetailsPanel:n}=t.components;return e.jsx(n,{children:e.jsx(Ue,{})})},qe=({name:t})=>{const n=h("Layout"),{ViewportNotificationsTray:s}=n.components;return e.jsxs(y,{role:"converter-graph-viewport",sx:{padding:1,height:"100%",position:"relative",overflow:"hidden"},children:[e.jsx(Ve,{graphId:L}),e.jsx(s,{children:e.jsx(e.Fragment,{})}),e.jsx(_e,{}),e.jsx(Be,{})]})},le=A.memo(qe),ze=()=>{const t=h("Layout"),{useViewportManager:n}=t.hooks,s=n();return e.jsx(e.Fragment,{children:e.jsx(U,{onClick:()=>s.functions.addViewport("Grafo de conversão","ConverterGraphViewport",void 0,"conversion-graph"),children:e.jsx(Me,{})})})},He={id:"conversion-graph",nodes:{},edges:{},adjacencyList:{},searchResults:{}},H=Ne();H.startListening({actionCreator:re,effect:async(t,n)=>{const{dispatch:s}=n;s(Ie({graphId:L})),s(we({graphId:L,graph:He})),s(Ae())}});H.startListening({actionCreator:z,effect:async(t,n)=>{const{dispatch:s}=n;s(Ge(t.payload))}});function We({dispatch:t,managers:{storeManager:n,componentRegistryManager:s,ribbonMenuManager:i}}){n.functions.loadReducer(I,Ee.reducer),n.functions.registerMiddleware(H),t(re()),s.functions.registerComponents({ribbonMenuSections:{ConversorGraphSection:A.memo(ze)},viewportTypes:{ConverterGraphViewport:le}}),i.functions.addNewTab({label:"Conversor",sectionNames:["ConversorGraphSection"],type:"base"})}function V(t){const n=ce(t);return`${n.amount} ${n.unit}`}function ce(t){const n=["centavos","R$"];let s=0,i=t;for(;i>=100&&s<n.length-1;)s+=1,i/=100;return{amount:i,unit:n[s]}}function R(t){return t<1e4?Math.round(Math.sqrt(t)):+Math.pow(t/1e3,2).toPrecision(2)}function Ye({label:t,icon:n,onChange:s,slots:i}){const[a,o]=A.useState(10),l=(r,d)=>{typeof d=="number"&&(o(d),s(ce(R(d)))),r.stopPropagation(),r.preventDefault()};return e.jsxs(y,{sx:{width:250},role:"money-slider",onPointerMove:r=>{r.stopPropagation(),r.preventDefault()},children:[e.jsxs(y,{children:[e.jsxs(ae,{id:"money-slider",gutterBottom:!0,children:[t,": ",V(R(a))]}),i?.coumpoundSelector]}),e.jsxs(w,{container:!0,spacing:2,alignItems:"center",children:[e.jsx(w,{item:!0,children:n}),e.jsx(w,{item:!0,xs:!0,children:e.jsx(oe,{value:a,min:0,step:.01,max:1e5,marks:[{value:1e4,label:"1 R$"},{value:32e3,label:"10 R$"}],scale:R,getAriaValueText:V,valueLabelFormat:V,onChange:l,valueLabelDisplay:"auto","aria-labelledby":"money-slider"})})]})]})}function te(t){const n=de(t);return`${n.amount} ${n.unit}`}function de(t){const n=["s","m","h","d"],s=[1,60,3600,86400],i=s.findIndex(l=>l>=t),a=Math.max(i<0?3:i-1,0);return{amount:Math.round(t/s[a]),unit:n[a]}}function ne(t){let s=t;return t<108e3?s=t/120:t<2*108e3?s=t/240:t>3*108e3&&(s=t),s}function Ze({label:t,icon:n,onChange:s,slots:i}){const[a,o]=A.useState(10),l=(r,d)=>{typeof d=="number"&&(o(d),s(de(ne(d)))),r.stopPropagation(),r.preventDefault()};return e.jsxs(y,{sx:{width:"min-content"},onPointerMove:r=>{r.stopPropagation(),r.preventDefault()},children:[e.jsxs(y,{sx:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:1},children:[e.jsxs(e.Fragment,{children:[e.jsx(N,{id:"quotient-number",size:"small",type:"number",sx:{minWidth:80},InputLabelProps:{shrink:!0},value:100}),e.jsxs(q,{id:"quotient-unit-selector",size:"small",sx:{width:"min-content"},children:[e.jsx(S,{value:"week",children:"Sem."}),e.jsx(S,{value:"day",children:"Dia"}),e.jsx(S,{value:"h",children:"Hr"}),e.jsx(S,{value:"m",children:"min"}),e.jsx(S,{value:"s",children:"sec"})]})]}),e.jsx("span",{children:"/"}),i?.coumpoundSelector]}),e.jsxs(w,{container:!0,spacing:2,alignItems:"center",children:[e.jsx(w,{item:!0,children:n}),e.jsx(w,{item:!0,xs:!0,children:e.jsx(oe,{value:a,min:0,step:10,max:432e3,marks:[],scale:ne,getAriaValueText:te,valueLabelFormat:te,onChange:l,valueLabelDisplay:"auto","aria-labelledby":"time-slider"})})]})]})}function Qe({scale:t,...n}){return t==="money"?e.jsx(Ye,{...n}):e.jsx(Ze,{...n})}function B({onChange:t,value:n,children:s,...i}){return e.jsxs(y,{role:"unit-selector",...i,sx:{display:"flex",gap:.2},children:[e.jsx(F,{children:e.jsx(N,{id:"amount",size:"small",type:"number",autoComplete:"off",sx:{width:"min-content",minWidth:80},value:n.amount,onChange:a=>t({unit:n.unit,amount:a.target.valueAsNumber})})}),e.jsx(F,{children:e.jsx(q,{id:"unit-selector",inputProps:{id:"unit"},size:"small",sx:{width:"min-content"},onChange:a=>t({amount:n.amount,unit:a.target.value}),value:n.unit,children:s})})]})}function Xe({quotientUnitsAvailable:t,dividendUnitsAvailable:n,label:s,value:i,onChange:a}){return e.jsxs(y,{role:"compound-selector",width:"min-content",sx:{display:"flex",gap:2,alignItems:"baseline"},children:[s&&e.jsx(ae,{gutterBottom:!0,children:s}),e.jsx(B,{id:"quotient-selector",value:i.quotient,onChange:o=>a({...i,quotient:o}),children:t().map(({value:o,label:l})=>e.jsx(S,{value:o,children:l},o))},"quotient"),e.jsx("span",{children:"/"}),e.jsx(B,{id:"dividend-selector",value:i.dividend,onChange:o=>a({...i,dividend:o}),children:n().map(({value:o,label:l})=>e.jsx(S,{value:o,children:l},o))},"dividend")]})}const Je=()=>({time:Object.entries(Te).map(([t,n])=>({value:t,label:n}))}),Ke=({icon:t,value:n})=>e.jsxs(y,{sx:{display:"flex",gap:.3,alignItems:"center"},children:[t&&e.jsx("div",{role:"coumpound-value-icon",children:t}),e.jsxs("div",{role:"coumpound-value-value",children:[n.quotient.amount," ",n.quotient.unit," / ",n.dividend.amount," ",n.dividend.unit]})]}),nt={name:I,version:Le,depends_on:["Graph"],components:{CoverterGraphViewport:le,ScaleSlider:Qe,CompoundSelector:Xe,UnitSelector:B,CompoundUnit:Ke},store:{actions:{},middlewares:[],reducers:{}},hooks:{useScales:Je},constants:{},kernelCalls:{startModule:We,restartModule:()=>{},shutdownModule:()=>{}}};export{nt as m};
