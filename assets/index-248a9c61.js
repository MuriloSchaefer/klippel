import{r as p,o as m,bi as R,R as g}from"./vendor-4a2caf03.js";import{D as y,M as v,L as S,p as E,q as L,s as w}from"./kernel-7bfe83e7.js";import{m as O}from"./system/Converter-e616e481.js";import{m as x}from"./system/Materials-edf1e5dd.js";import{m as P}from"./system/Composer-0a2df823.js";import"./system/Composer/components-c3982b3e.js";import"./system/Composer/hooks-6a7da7fd.js";(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))l(t);new MutationObserver(t=>{for(const e of t)if(e.type==="childList")for(const s of e.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&l(s)}).observe(document,{childList:!0,subtree:!0});function o(t){const e={};return t.integrity&&(e.integrity=t.integrity),t.referrerPolicy&&(e.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?e.credentials="include":t.crossOrigin==="anonymous"?e.credentials="omit":e.credentials="same-origin",e}function l(t){if(t.ep)return;t.ep=!0;const e=o(t);fetch(t.href,e)}})();const j="modulepreload",W=function(d,r){return new URL(d,r).href},h={},b=function(r,o,l){if(!o||o.length===0)return r();const t=document.getElementsByTagName("link");return Promise.all(o.map(e=>{if(e=W(e,l),e in h)return;h[e]=!0;const s=e.endsWith(".css"),u=s?'[rel="stylesheet"]':"";if(!!l)for(let a=t.length-1;a>=0;a--){const c=t[a];if(c.href===e&&(!s||c.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${e}"]${u}`))return;const n=document.createElement("link");if(n.rel=s?"stylesheet":j,s||(n.as="script",n.crossOrigin=""),n.href=e,document.head.appendChild(n),s)return new Promise((a,c)=>{n.addEventListener("load",a),n.addEventListener("error",()=>c(new Error(`Unable to preload CSS for ${e}`)))})})).then(()=>r())};function M(d={}){const{immediate:r=!1,onNeedRefresh:o,onOfflineReady:l,onRegistered:t,onRegisteredSW:e,onRegisterError:s}=d;let u,f;const n=async(c=!0)=>{await f};async function a(){if("serviceWorker"in navigator){const{Workbox:c}=await b(()=>import("./vendor-4a2caf03.js").then(i=>i.bj),[],import.meta.url);u=new c("./sw.js",{scope:"./",type:"classic"}),u.addEventListener("activated",i=>{(i.isUpdate||i.isExternal)&&window.location.reload()}),u.addEventListener("installed",i=>{i.isUpdate||l?.()}),u.register({immediate:r}).then(i=>{e?e("./sw.js",i):t?.(i)}).catch(i=>{s?.(i)})}}return f=a(),n}function N(d={}){const{immediate:r=!0,onNeedRefresh:o,onOfflineReady:l,onRegistered:t,onRegisteredSW:e,onRegisterError:s}=d,[u,f]=p.useState(!1),[n,a]=p.useState(!1),[c]=p.useState(()=>M({immediate:r,onOfflineReady(){a(!0),l?.()},onNeedRefresh(){f(!0),o?.()},onRegistered:t,onRegisteredSW:e,onRegisterError:s}));return{needRefresh:[u,f],offlineReady:[n,a],updateServiceWorker:c}}const _=()=>{N({onRegistered(o){o&&setInterval(()=>{o.update()},36e5)}});const r={kernel:[E,L,w],system:[O,x,P]};return m.jsx(y,{children:m.jsx(v,{loadModules:r,children:m.jsx(S,{})})})},$=R(document.getElementById("root"));$.render(m.jsx(g.StrictMode,{children:m.jsx(_,{})}));