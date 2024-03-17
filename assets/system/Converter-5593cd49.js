import{c as $,d as be,b as ye,_ as oe,o as e,B as g,aZ as _,a_ as fe,a$ as P,b0 as C,r as h,aD as L,aT as X,aX as je,aS as V,aO as Ie,R as A,n as Ce,ba as Se,P as Ne,I as H,bb as Te,bc as Oe,bd as Le,be as R,T as U,Z as Ge,$ as Me,bf as ce,bg as Ee,e as ke,bh as M,bi as ue}from"../vendor-45e5b32e.js";import{A as B,n as p,o as Ae,l as we}from"../kernel-28f3b0f3.js";const G="Converter",_e="0.0.1",S="conversion-graph",Ue={week:"Semana",day:"Dia",h:"H",m:"m",s:"s",ms:"ms"},$e={selectedNode:void 0},me=$(`[${G}:${B.COMMAND}] Load conversion graph`),Y=$(`[${G}:${B.COMMAND}] Select node`),Pe=$(`[${G}:${B.EVENT}] Conversion graph loaded`),Be=$(`[${G}:${B.COMMAND}] Node selected`),qe=be({name:G,initialState:$e,reducers:{},extraReducers:o=>{o.addCase(Y,(t,{payload:s})=>({...t,selectedNode:s}))}}),se=o=>o.Converter,O=o=>{const t=p("Store"),s=p("Graph"),d=p("Layout"),{useGraph:n}=s.hooks,a=n(S,m=>m),r=d.hooks.usePanelsManager(),{useAppDispatch:i,useAppSelector:c}=t.hooks,u=i(),l=ye(se,o),j=c(l);return c(se),{state:j,selectNode:m=>{u(Y(m)),r.functions.openDetails()},addUnit:(m,E,T)=>{const y=oe.uniqueId(m.toLowerCase().replace(" ",""));a.actions.addNode({type:"UNIT",id:y,name:m,position:{x:0,y:0},abbreviation:E}),console.log(T),T&&(console.log("add scale"),a.actions.addEdge({id:`${y} -> ${T}`,type:"BELONGS_TO",sourceId:y,targetId:T}))},updateUnit:(m,E,T,y)=>{a.actions.updateNode({id:m,name:E,abbreviation:T});const I=a.state?.adjacencyList[m].outputs.filter(k=>a.state?.edges[k].type==="BELONGS_TO").map(k=>a.state?.edges[k]).pop();y?(I&&I.targetId!==y&&a.actions.removeEdge(I.id),a.actions.addEdge({id:`${m} -> ${y}`,type:"BELONGS_TO",sourceId:m,targetId:y})):I&&a.actions.removeEdge(I.id)},addScale:m=>{a.actions.addNode({type:"SCALE",id:oe.uniqueId(m.toLowerCase().replace(" ","")),name:m,position:{x:0,y:0}})}}};function pe({onChange:o,value:t,...s}){const d=p("Graph"),{hooks:{useGraph:n}}=d,a=n(S,r=>r&&Object.values(r.nodes).filter(i=>i.type==="SCALE"));return a.state?e.jsx(g,{role:"scale-selector",...s,sx:{display:"flex",gap:.2},children:e.jsxs(_,{sx:{m:1,minWidth:120,width:"min-content"},children:[e.jsx(fe,{id:"label",children:"Escala"}),e.jsxs(P,{id:"scale-selector",inputProps:{id:"scale"},label:"Escala",labelId:"label",size:"small",onChange:r=>o(r.target.value),value:t??"",children:[a.state.map(r=>e.jsx(C,{value:r.id,children:r.name})),e.jsx(C,{value:"",children:"Nenhuma"})]})]})}):e.jsx(e.Fragment,{})}const ne={name:void 0,abbreviation:void 0,scale:void 0},De=()=>{const o=p("Pointer"),{PointerContainer:t,ConfirmAndCloseButton:s}=o.components,d=O(i=>i),[n,a]=h.useState(ne),r=h.useCallback(()=>{!n.name||!n.abbreviation||(d.addUnit(n.name,n.abbreviation,n.scale),a(ne))},[n,d]);return e.jsx(t,{component:e.jsxs(g,{sx:{display:"flex",flexDirection:"column",gap:1},children:[e.jsx(L,{id:"unit-name",label:"Nome",variant:"standard",value:n.name,onChange:i=>a(c=>({...c,name:i.target.value}))}),e.jsx(L,{id:"abbreviation",label:"Abbreviation",variant:"standard",value:n.abbreviation,onChange:i=>a(c=>({...c,abbreviation:i.target.value})),sx:{alignItems:"center"}}),e.jsx(pe,{value:n.scale??"",onChange:i=>a(c=>({...c,scale:i}))})]}),actions:[e.jsx(s,{handleConfirm:r},"confirm")],children:e.jsx(X,{primary:"Unidade",secondary:"Adiciona um tipo de unidade simples",sx:{cursor:"pointer",flexGrow:1}})})},ae={name:void 0},Fe=()=>{const o=p("Pointer"),{PointerContainer:t,ConfirmAndCloseButton:s}=o.components,d=O(i=>i),[n,a]=h.useState(ae),r=h.useCallback(()=>{n.name&&(d.addScale(n.name),a(ae))},[n,d]);return e.jsx(t,{component:e.jsx(g,{sx:{display:"flex",flexDirection:"column",gap:1},children:e.jsx(L,{id:"part-name",label:"Nome",variant:"standard",value:n.name,onChange:i=>a(c=>({...c,name:i.target.value}))})}),actions:[e.jsx(s,{handleConfirm:r},"confirm")],children:e.jsx(X,{primary:"Escala",secondary:"Adiciona um tipo de escala",sx:{cursor:"pointer",flexGrow:1}})})},ie={name:void 0,abbreviation:void 0,scale:void 0},Ve=()=>{const o=p("Pointer"),{PointerContainer:t,ConfirmAndCloseButton:s}=o.components,d=O(i=>i),[n,a]=h.useState(ie),r=h.useCallback(()=>{!n.name||!n.abbreviation||(d.addUnit(n.name,n.abbreviation,n.scale),a(ie))},[n,d]);return e.jsx(t,{component:e.jsx(g,{sx:{display:"flex",flexDirection:"column",gap:1}}),actions:[e.jsx(s,{handleConfirm:r},"confirm")],children:e.jsx(X,{primary:"Unidade Composta",secondary:"Adiciona um tipo de unidade composta",sx:{cursor:"pointer",flexGrow:1}})})},Re=()=>e.jsxs(je,{role:"list-options",sx:{paddingRight:5,overflow:"auto"},children:[e.jsx(V,{disableGutters:!0,children:e.jsx(De,{})},"unit"),e.jsx(V,{disableGutters:!0,children:e.jsx(Ve,{})},"compositeUnit"),e.jsx(V,{disableGutters:!0,children:e.jsx(Fe,{})},"scale")]}),ze=()=>{const o=p("Layout"),{SettingsPanel:t,Accordion:s}=o.components;return e.jsxs(t,{children:[e.jsx(s,{name:"Nodos",icon:e.jsx(Ie,{}),summary:"Tipos de nodos disponíveis",children:e.jsx(Re,{})}),e.jsx(e.Fragment,{})]})},We=({graphId:o})=>{const{hooks:{useResizeObserver:t}}=p("Layout"),{hooks:{useGraph:s}}=p("Graph"),{hooks:{useD3Container:d},d3Components:{Grid:n,DependencyCircle:a}}=p("SVG"),r=O(x=>x),i=h.useRef(null),c=h.useRef(null),u=t(c),l=s(o,x=>x),j=h.useMemo(()=>{if(!l.state?.nodes)return{nodes:[],links:[]};const x=v=>{if(!l.state)return{id:"other",name:"Outros"};const N=Object.values(l.state.edges).find(f=>f.sourceId===v.id&&f.type==="BELONGS_TO");if(N){const f=l.state.nodes[N.targetId];return{id:f.id,name:f.name}}return{id:"other",name:"Outros"}};return{nodes:Object.values(l.state.nodes).map(v=>({...v,nodeLabel:"abbreviation"in v?v.abbreviation:v.name,group:x(v),radius:5,strength:10,x:v.position.x,y:v.position.y})),links:Object.values(l.state.edges).map(v=>({...v,source:v.sourceId,target:v.targetId}))}},[l]),m=Ce(),[E,T]=h.useState(!0),[y,I]=[u?.width??700,u?.height??700],k=h.useCallback(x=>{r.selectNode(x)},[]),K=h.useCallback(x=>{r.selectNode(x)},[]),ge=d().width(y).height(I).underlays([n({xSettings:{range:[-1,y+1],domain:[-1,y+1]},ySettings:{range:[-1,I+1],domain:[-1,I+1]},dimensions:[y,I]}).transformZoom((x,v)=>{E&&(v.translateBy(x,y/2,I/2),T(!1))}).build]).content([a().innerRadius(Math.min(y,I)/2-20).filterNode(x=>x.type==="UNIT"||x.type==="COMPOUND_UNIT").filterLink(x=>x.type==="CONVERTS_TO").renderGroup((x,v,N,f,w,Q)=>{x.selectAll("path").data([v]).join("path").attr("id",b=>b.id).on("click",b=>b.target.id!=="other"&&K(b.target.id)).attr("class","group-arc").attr("fill",b=>f(v.id)).attr("d",(b,ee)=>w(N)),x.selectAll("text").data([v]).join("text").attr("class","group-text").text(b=>b.name).attr("id",b=>b.id).on("click",b=>b.target.id!=="other"&&K(b.target.id)).attr("fill",b=>f(b.id)).attr("text-anchor",(b,ee)=>(N.endAngle+N.startAngle)/2>Math.PI?"end":"start").attr("transform",(b,ee)=>{const[D,F]=w.centroid(N),te=Math.sqrt(D*D+F*F);return`translate(${D/te*Q*1.3}, ${F/te*Q*1.3})`})}).renderNode((x,v,N)=>{x.append("text").text(f=>f.nodeLabel).attr("fill",f=>r.state?.selectedNode===f.id?m.palette.getContrastText(m.palette.background.default):N(f.group.id)).attr("text-anchor","middle").on("pointerdown",(f,w)=>{k(w.id),f.stopPropagation()})}).theme(m.palette.mode).build]);return h.useLayoutEffect(()=>{!u||!i.current||ge.render(j,i.current)},[j,u]),l.state?e.jsx("div",{ref:c,role:"conversion-graph-viewer",style:{height:"100%",width:"100%"},children:e.jsx("svg",{ref:i,id:`${l.id}`,width:"100%",height:"100%"})}):e.jsx(e.Fragment,{})},He=A.memo(We),Ze=()=>{const o=p("Layout"),{Accordion:t}=o.components,s=p("Graph"),{useGraph:d}=s.hooks,n=O(u=>u.selectedNode),a=d(S,u=>n.state&&u?.nodes?{...u.nodes[n.state],scale:u.adjacencyList[n.state].outputs.filter(l=>u.edges[l].type==="BELONGS_TO").map(l=>u.edges[l].targetId).pop()}:void 0),[r,i]=h.useState(a.state);h.useEffect(()=>i(a.state),[n.state]);const c=h.useCallback(()=>{n.updateUnit(n.state,r?.name,r?.abbreviation,r?.scale)},[a]);return!n?.state||!a?.state?e.jsx(e.Fragment,{}):e.jsx(t,{name:"Propriedades",icon:e.jsx(Se,{}),summary:"Propriedades da unidade",children:e.jsxs(Ne,{variant:"outlined",square:!0,sx:{width:"100%",padding:1,"&:div + div":{borderTop:0},display:"flex",justifyContent:"space-between"},role:"unit-properties",children:[e.jsx(L,{id:"unit-name",label:"Nome",variant:"standard",value:r?.name??"",onChange:u=>i(l=>l&&{...l,name:u.target.value})}),e.jsx(L,{id:"abbreviation",label:"Abreviatura",variant:"standard",value:r?.abbreviation??"",onChange:u=>i(l=>l&&{...l,abbreviation:u.target.value}),sx:{alignItems:"center"}}),e.jsx(pe,{value:r?.scale??"",onChange:u=>i(l=>l&&{...l,scale:u})}),e.jsxs(g,{sx:{display:"flex",flexDirection:"column",padding:0,gap:1,justifyContent:"space-between",alignContent:"space-evenly"},role:"actions",children:[e.jsx(H,{color:"success",id:"save-unit-properties",onClick:u=>c(),children:e.jsx(Te,{})},"save"),e.jsx(H,{color:"info",id:"reset-unit-properties",onClick:u=>i(a.state),children:e.jsx(Oe,{})},"reset")]})]})})},q=o=>{const t=p("Graph"),{useGraph:s}=t.hooks;return s(S,n=>n&&Object.values(n.nodes).filter(a=>o.includes(a.id)).reduce((a,r)=>({...a,[r.id]:r}),{})).state},re=({value:o,filterUnits:t=()=>!0,...s})=>{const d=p("Graph"),{useGraph:n}=d.hooks,a=n(S,i=>Object.values(i?.nodes??{}).filter(c=>c.type==="UNIT").map(c=>({...c,scale:Object.values(i?.nodes??{}).filter(u=>u.type==="SCALE").find(u=>i?.adjacencyList[c.id].outputs.includes(`${c.id} -> ${u.id}`))}))),r=h.useMemo(()=>a?.state?.filter(i=>t(i,i.scale))??[],[a.state,t]);return e.jsx(_,{children:e.jsx(P,{id:"unit-selector",inputProps:{id:"unit"},size:"small",sx:{width:"max(min-content, 100px)",minWidth:100},onChange:i=>console.log(i),value:o,...s,children:r.map(({id:i,name:c,abbreviation:u})=>e.jsx(C,{value:i,children:u},i))})})},Xe=({from:o,to:t})=>{const s=p("Pointer"),{PointerContainer:d,ConfirmAndCloseButton:n}=s.components,[a,r]=h.useState({type:"multiplication",from:o,to:t}),i=h.useCallback(()=>{console.log("test")},[]);return e.jsx(d,{component:e.jsxs(g,{sx:{display:"flex",flexDirection:"column",gap:1},children:[e.jsx(g,{role:"conversion-type",sx:{display:"flex",flexDirection:"row",alignItems:"center",gap:1},children:e.jsxs(Le,{color:"primary",value:a.type,exclusive:!0,onChange:(c,u)=>r(l=>({...l,type:u})),"aria-label":"Platform",children:[e.jsx(R,{value:"division",children:"Divisão"}),e.jsx(R,{value:"multiplication",children:"Multiplicação"}),e.jsx(R,{value:"parametrized",children:"Parametrizada"})]})}),e.jsxs(g,{role:"from-conversion",sx:{display:"flex",flexDirection:"row",alignItems:"center",gap:1},children:[e.jsx(U,{sx:{minWidth:30},children:"De:"}),e.jsx(re,{})]}),e.jsxs(g,{role:"to-conversion",sx:{display:"flex",flexDirection:"row",alignItems:"center",gap:1},children:[e.jsx(U,{sx:{minWidth:30},children:"Para:"}),e.jsx(re,{value:a.to,disabled:!!t})]})]}),actions:[e.jsx(n,{handleConfirm:i},"confirm")],children:e.jsx(Ge,{startIcon:e.jsx(Me,{}),variant:"outlined",size:"small",sx:{marginBottom:1},children:"Adicionar Conversão"})})},Ye=()=>{const o=p("Layout"),t=O(a=>a.selectedNode),s=q([t.state]);if(!s||!t.state)throw Error("units should be available");const d=s[t.state],{Accordion:n}=o.components;return e.jsx(n,{name:"Converte de",icon:e.jsx(ce,{}),summary:`Quais unidades podem ser convertidas em ${d.name}`,children:e.jsx(Xe,{to:d.id})})},Je=()=>{const o=p("Layout"),t=O(a=>a.selectedNode),s=q([t.state]);if(!s||!t.state)throw Error("units should be available");const d=s[t.state],{Accordion:n}=o.components;return e.jsx(n,{name:"Converte para",icon:e.jsx(ce,{sx:{transform:"rotate(180)"}}),summary:`${d.name} pode ser convertida em`,children:e.jsx(e.Fragment,{})})},Ke=()=>e.jsxs(e.Fragment,{children:[e.jsx(Ze,{}),e.jsx(Ye,{}),e.jsx(Je,{})]}),Qe=()=>e.jsx(e.Fragment,{children:"Escala selectionada"}),et=()=>{const o=p("Layout"),t=p("Graph"),{DetailsPanel:s}=o.components,{useGraph:d}=t.hooks,n=O(r=>r.selectedNode),a=d(S,r=>n.state?r?.nodes[n.state]:void 0);return a.state?e.jsx(s,{children:e.jsxs(e.Fragment,{children:[a?.state?.type==="UNIT"&&e.jsx(Ke,{}),a?.state?.type==="SCALE"&&e.jsx(Qe,{})]})}):e.jsx(e.Fragment,{})},tt=({name:o})=>{const t=p("Layout"),{ViewportNotificationsTray:s}=t.components;return e.jsxs(g,{role:"converter-graph-viewport",sx:{padding:1,height:"100%",position:"relative",overflow:"hidden"},children:[e.jsx(He,{graphId:S}),e.jsx(s,{children:e.jsx(e.Fragment,{})}),e.jsx(ze,{}),e.jsx(et,{})]})},xe=A.memo(tt),ot=()=>{const o=p("Layout"),{useViewportManager:t}=o.hooks,s=t();return e.jsx(e.Fragment,{children:e.jsx(H,{onClick:()=>s.functions.addViewport("Grafo de conversão","ConverterGraphViewport",void 0,"conversion-graph"),children:e.jsx(Ee,{})})})},st={id:"conversion-graph",nodes:{metros5:{type:"UNIT",id:"metros5",name:"metros",position:{x:0,y:0},abbreviation:"m"},comprimento6:{type:"SCALE",id:"comprimento6",name:"Comprimento",position:{x:0,y:0}},centimetros7:{type:"UNIT",id:"centimetros7",name:"centimetros",position:{x:0,y:0},abbreviation:"cm"},kilometros8:{type:"UNIT",id:"kilometros8",name:"kilometros",position:{x:0,y:0},abbreviation:"km"},milimetros9:{type:"UNIT",id:"milimetros9",name:"milimetros",position:{x:0,y:0},abbreviation:"mm"},monetaria10:{type:"SCALE",id:"monetaria10",name:"Monetaria",position:{x:0,y:0}},reais11:{type:"UNIT",id:"reais11",name:"reais",position:{x:0,y:0},abbreviation:"R$"},dolares12:{type:"UNIT",id:"dolares12",name:"dolares",position:{x:0,y:0},abbreviation:"$"},volume13:{type:"SCALE",id:"volume13",name:"Volume",position:{x:0,y:0}},litroscubicos14:{type:"UNIT",id:"litroscubicos14",name:"litros cubicos",position:{x:0,y:0},abbreviation:"l³"},metroscubicos15:{type:"UNIT",id:"metroscubicos15",name:"metros cubicos",position:{x:0,y:0},abbreviation:"m³"},area16:{type:"SCALE",id:"area16",name:"Area",position:{x:0,y:0}},metrosquadrados17:{type:"UNIT",id:"metrosquadrados17",name:"metros quadrados",position:{x:0,y:0},abbreviation:"m²"},unitario18:{type:"UNIT",id:"unitario18",name:"unitario",position:{x:0,y:0},abbreviation:"un"},capacidade5:{type:"SCALE",id:"capacidade5",name:"Capacidade",position:{x:0,y:0}},mililitros6:{type:"UNIT",id:"mililitros6",name:"mililitros",position:{x:0,y:0},abbreviation:"ml"},litros7:{type:"UNIT",id:"litros7",name:"litros",position:{x:0,y:0},abbreviation:"l"},kilometrosquadrados8:{type:"UNIT",id:"kilometrosquadrados8",name:"kilometros quadrados",position:{x:0,y:0},abbreviation:"km²"},centimetrosquadrados9:{type:"UNIT",id:"centimetrosquadrados9",name:"centimetros quadrados",position:{x:0,y:0},abbreviation:"cm²"},temporal247:{type:"SCALE",id:"temporal247",name:"Temporal",position:{x:0,y:0}},segundos248:{type:"UNIT",id:"segundos248",name:"segundos",position:{x:0,y:0},abbreviation:"s"},minutos249:{type:"UNIT",id:"minutos249",name:"minutos",position:{x:0,y:0},abbreviation:"m"},hora250:{type:"UNIT",id:"hora250",name:"hora",position:{x:0,y:0},abbreviation:"h"},dia251:{type:"UNIT",id:"dia251",name:"dia",position:{x:0,y:0},abbreviation:"d"},mes252:{type:"UNIT",id:"mes252",name:"mes",position:{x:0,y:0},abbreviation:"m"},semana253:{type:"UNIT",id:"semana253",name:"semana",position:{x:0,y:0},abbreviation:"sem"}},edges:{"metros5 -> comprimento6":{id:"metros5 -> comprimento6",type:"BELONGS_TO",sourceId:"metros5",targetId:"comprimento6"},"centimetros7 -> comprimento6":{id:"centimetros7 -> comprimento6",type:"BELONGS_TO",sourceId:"centimetros7",targetId:"comprimento6"},"kilometros8 -> comprimento6":{id:"kilometros8 -> comprimento6",type:"BELONGS_TO",sourceId:"kilometros8",targetId:"comprimento6"},"milimetros9 -> comprimento6":{id:"milimetros9 -> comprimento6",type:"BELONGS_TO",sourceId:"milimetros9",targetId:"comprimento6"},"reais11 -> monetaria10":{id:"reais11 -> monetaria10",type:"BELONGS_TO",sourceId:"reais11",targetId:"monetaria10"},"dolares12 -> monetaria10":{id:"dolares12 -> monetaria10",type:"BELONGS_TO",sourceId:"dolares12",targetId:"monetaria10"},"litroscubicos14 -> volume13":{id:"litroscubicos14 -> volume13",type:"BELONGS_TO",sourceId:"litroscubicos14",targetId:"volume13"},"metroscubicos15 -> volume13":{id:"metroscubicos15 -> volume13",type:"BELONGS_TO",sourceId:"metroscubicos15",targetId:"volume13"},"metrosquadrados17 -> area16":{id:"metrosquadrados17 -> area16",type:"BELONGS_TO",sourceId:"metrosquadrados17",targetId:"area16"},"mililitros6 -> volume13":{id:"mililitros6 -> volume13",type:"BELONGS_TO",sourceId:"mililitros6",targetId:"volume13"},"litros7 -> volume13":{id:"litros7 -> volume13",type:"BELONGS_TO",sourceId:"litros7",targetId:"volume13"},"kilometrosquadrados8 -> area16":{id:"kilometrosquadrados8 -> area16",type:"BELONGS_TO",sourceId:"kilometrosquadrados8",targetId:"area16"},"centimetrosquadrados9 -> area16":{id:"centimetrosquadrados9 -> area16",type:"BELONGS_TO",sourceId:"centimetrosquadrados9",targetId:"area16"},"segundos248 -> temporal247":{id:"segundos248 -> temporal247",type:"BELONGS_TO",sourceId:"segundos248",targetId:"temporal247"},"minutos249 -> temporal247":{id:"minutos249 -> temporal247",type:"BELONGS_TO",sourceId:"minutos249",targetId:"temporal247"},"hora250 -> temporal247":{id:"hora250 -> temporal247",type:"BELONGS_TO",sourceId:"hora250",targetId:"temporal247"},"dia251 -> temporal247":{id:"dia251 -> temporal247",type:"BELONGS_TO",sourceId:"dia251",targetId:"temporal247"},"mes252 -> temporal247":{id:"mes252 -> temporal247",type:"BELONGS_TO",sourceId:"mes252",targetId:"temporal247"},"semana253 -> temporal247":{id:"semana253 -> temporal247",type:"BELONGS_TO",sourceId:"semana253",targetId:"temporal247"}},adjacencyList:{metros5:{inputs:[],outputs:["metros5 -> comprimento6"]},comprimento6:{inputs:["metros5 -> comprimento6","centimetros7 -> comprimento6","kilometros8 -> comprimento6","milimetros9 -> comprimento6"],outputs:[]},centimetros7:{inputs:[],outputs:["centimetros7 -> comprimento6"]},kilometros8:{inputs:[],outputs:["kilometros8 -> comprimento6"]},milimetros9:{inputs:[],outputs:["milimetros9 -> comprimento6"]},monetaria10:{inputs:["reais11 -> monetaria10","dolares12 -> monetaria10"],outputs:[]},reais11:{inputs:[],outputs:["reais11 -> monetaria10"]},dolares12:{inputs:[],outputs:["dolares12 -> monetaria10"]},volume13:{inputs:["litroscubicos14 -> volume13","metroscubicos15 -> volume13","mililitros6 -> volume13","litros7 -> volume13"],outputs:[]},litroscubicos14:{inputs:[],outputs:["litroscubicos14 -> volume13"]},metroscubicos15:{inputs:[],outputs:["metroscubicos15 -> volume13"]},area16:{inputs:["metrosquadrados17 -> area16","kilometrosquadrados8 -> area16","centimetrosquadrados9 -> area16"],outputs:[]},metrosquadrados17:{inputs:[],outputs:["metrosquadrados17 -> area16"]},unitario18:{inputs:[],outputs:[]},capacidade5:{inputs:[],outputs:[]},mililitros6:{inputs:[],outputs:["mililitros6 -> volume13"]},litros7:{inputs:[],outputs:["litros7 -> volume13"]},kilometrosquadrados8:{inputs:[],outputs:["kilometrosquadrados8 -> area16"]},centimetrosquadrados9:{inputs:[],outputs:["centimetrosquadrados9 -> area16"]},temporal247:{inputs:["segundos248 -> temporal247","minutos249 -> temporal247","hora250 -> temporal247","dia251 -> temporal247","mes252 -> temporal247","semana253 -> temporal247"],outputs:[]},segundos248:{inputs:[],outputs:["segundos248 -> temporal247"]},minutos249:{inputs:[],outputs:["minutos249 -> temporal247"]},hora250:{inputs:[],outputs:["hora250 -> temporal247"]},dia251:{inputs:[],outputs:["dia251 -> temporal247"]},mes252:{inputs:[],outputs:["mes252 -> temporal247"]},semana253:{inputs:[],outputs:["semana253 -> temporal247"]}},searchResults:{}},J=ke();J.startListening({actionCreator:me,effect:async(o,t)=>{const{dispatch:s}=t;s(Ae({graphId:S})),s(we({graphId:S,graph:st})),s(Pe())}});J.startListening({actionCreator:Y,effect:async(o,t)=>{const{dispatch:s}=t;s(Be(o.payload))}});function nt({dispatch:o,managers:{storeManager:t,componentRegistryManager:s,ribbonMenuManager:d}}){t.functions.loadReducer(G,qe.reducer),t.functions.registerMiddleware(J),o(me()),s.functions.registerComponents({ribbonMenuSections:{ConversorGraphSection:A.memo(ot)},viewportTypes:{ConverterGraphViewport:xe}}),d.functions.addNewTab({label:"Conversor",sectionNames:["ConversorGraphSection"],type:"base"})}function z(o){const t=he(o);return`${t.amount} ${t.unit}`}function he(o){const t=["centavos","R$"];let s=0,d=o;for(;d>=100&&s<t.length-1;)s+=1,d/=100;return{amount:d,unit:t[s]}}function W(o){return o<1e4?Math.round(Math.sqrt(o)):+Math.pow(o/1e3,2).toPrecision(2)}function at({label:o,icon:t,onChange:s,slots:d}){const[n,a]=A.useState(10),r=(i,c)=>{typeof c=="number"&&(a(c),s(he(W(c)))),i.stopPropagation(),i.preventDefault()};return e.jsxs(g,{sx:{width:250},role:"money-slider",onPointerMove:i=>{i.stopPropagation(),i.preventDefault()},children:[e.jsxs(g,{children:[e.jsxs(U,{id:"money-slider",gutterBottom:!0,children:[o,": ",z(W(n))]}),d?.coumpoundSelector]}),e.jsxs(M,{container:!0,spacing:2,alignItems:"center",children:[e.jsx(M,{item:!0,children:t}),e.jsx(M,{item:!0,xs:!0,children:e.jsx(ue,{value:n,min:0,step:.01,max:1e5,marks:[{value:1e4,label:"1 R$"},{value:32e3,label:"10 R$"}],scale:W,getAriaValueText:z,valueLabelFormat:z,onChange:r,valueLabelDisplay:"auto","aria-labelledby":"money-slider"})})]})]})}function de(o){const t=ve(o);return`${t.amount} ${t.unit}`}function ve(o){const t=["s","m","h","d"],s=[1,60,3600,86400],d=s.findIndex(r=>r>=o),n=Math.max(d<0?3:d-1,0);return{amount:Math.round(o/s[n]),unit:t[n]}}function le(o){let s=o;return o<108e3?s=o/120:o<2*108e3?s=o/240:o>3*108e3&&(s=o),s}function it({label:o,icon:t,onChange:s,slots:d}){const[n,a]=A.useState(10),r=(i,c)=>{typeof c=="number"&&(a(c),s(ve(le(c)))),i.stopPropagation(),i.preventDefault()};return e.jsxs(g,{sx:{width:"min-content"},onPointerMove:i=>{i.stopPropagation(),i.preventDefault()},children:[e.jsxs(g,{sx:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:1},children:[e.jsxs(e.Fragment,{children:[e.jsx(L,{id:"quotient-number",size:"small",type:"number",sx:{minWidth:80},InputLabelProps:{shrink:!0},value:100}),e.jsxs(P,{id:"quotient-unit-selector",size:"small",sx:{width:"min-content"},children:[e.jsx(C,{value:"week",children:"Sem."}),e.jsx(C,{value:"day",children:"Dia"}),e.jsx(C,{value:"h",children:"Hr"}),e.jsx(C,{value:"m",children:"min"}),e.jsx(C,{value:"s",children:"sec"})]})]}),e.jsx("span",{children:"/"}),d?.coumpoundSelector]}),e.jsxs(M,{container:!0,spacing:2,alignItems:"center",children:[e.jsx(M,{item:!0,children:t}),e.jsx(M,{item:!0,xs:!0,children:e.jsx(ue,{value:n,min:0,step:10,max:432e3,marks:[],scale:le,getAriaValueText:de,valueLabelFormat:de,onChange:r,valueLabelDisplay:"auto","aria-labelledby":"time-slider"})})]})]})}function rt({scale:o,...t}){return o==="money"?e.jsx(at,{...t}):e.jsx(it,{...t})}function Z({onChange:o,value:t,children:s,selectorProps:d={sx:{}},textFieldProps:n={sx:{}},...a}){return e.jsxs(g,{role:"unit-selector",...a,sx:{display:"flex",gap:.2},children:[e.jsx(_,{children:e.jsx(L,{id:"amount",size:"small",type:"number",autoComplete:"off",sx:{...d.sx,width:"100px",minWidth:80},value:t.amount,onChange:r=>o({unit:t.unit,amount:r.target.valueAsNumber})})}),e.jsx(_,{children:e.jsx(P,{id:"unit-selector",inputProps:{id:"unit"},size:"small",sx:{...n.sx,width:"max(min-content, 100px)",minWidth:100},onChange:r=>o({amount:t.amount,unit:r.target.value}),value:t.unit,children:s})})]})}function dt({label:o,value:t,onChange:s,filterQuotients:d=()=>!0,filterDividends:n=()=>!0}){const a=p("Graph"),{useGraph:r}=a.hooks,i=r(S,l=>Object.values(l?.nodes??{}).filter(j=>j.type==="UNIT").map(j=>({...j,scale:Object.values(l?.nodes??{}).filter(m=>m.type==="SCALE").find(m=>l?.adjacencyList[j.id].outputs.includes(`${j.id} -> ${m.id}`))}))),c=h.useMemo(()=>i?.state?.filter(l=>d(l,l.scale))??[],[i.state,d]),u=h.useMemo(()=>i?.state?.filter(l=>n(l,l.scale))??[],[i.state,d]);return e.jsxs(g,{role:"compound-selector",width:"min-content",sx:{display:"flex",gap:1,alignItems:"baseline"},children:[o&&e.jsx(U,{gutterBottom:!0,sx:{minWidth:"50px"},children:o}),e.jsxs(g,{sx:{display:"flex",gap:1,alignItems:"baseline"},children:[e.jsx(Z,{id:"quotient-selector",value:t.quotient,onChange:l=>s({...t,quotient:l}),selectorProps:{sx:{width:"10px"}},children:c.map(({id:l,name:j,abbreviation:m})=>e.jsx(C,{value:l,children:m},l))},"quotient"),e.jsx("span",{children:"/"}),e.jsx(Z,{id:"dividend-selector",value:t.dividend,onChange:l=>s({...t,dividend:l}),sx:{width:"max-content"},children:u.map(({id:l,name:j,abbreviation:m})=>e.jsx(C,{value:l,children:m},l))},"dividend")]})]})}const lt=()=>({time:Object.entries(Ue).map(([o,t])=>({value:o,label:t}))}),ct=({icon:o,value:t})=>{const s=q([t.quotient.unit,t.dividend.unit]);return s?e.jsxs(g,{sx:{display:"flex",gap:.3,alignItems:"center"},children:[o&&e.jsx("div",{role:"coumpound-value-icon",children:o}),e.jsxs("div",{role:"coumpound-value-value",children:[t.quotient.amount," ",s[t.quotient.unit].abbreviation," / ",t.dividend.amount," ",s[t.dividend.unit].abbreviation]})]}):e.jsx(e.Fragment,{})},pt={name:G,version:_e,depends_on:["Graph"],components:{CoverterGraphViewport:xe,ScaleSlider:rt,CompoundSelector:dt,UnitAmountSelector:Z,CompoundUnit:ct},store:{actions:{},middlewares:[],reducers:{}},hooks:{useScales:lt,useUnits:q},constants:{},kernelCalls:{startModule:nt,restartModule:()=>{},shutdownModule:()=>{}}};export{pt as m};
