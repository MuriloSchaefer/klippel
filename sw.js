if(!self.define){let e,s={};const o=(o,a)=>(o=new URL(o+".js",a).href,s[o]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=o,e.onload=s,document.head.appendChild(e)}else e=o,importScripts(o),s()})).then((()=>{let e=s[o];if(!e)throw new Error(`Module ${o} didn’t register its module`);return e})));self.define=(a,i)=>{const n=e||("document"in self?document.currentScript.src:"")||location.href;if(s[n])return;let r={};const l=e=>o(e,n),t={module:{uri:n},exports:r,require:l};s[n]=Promise.all(a.map((e=>t[e]||l(e)))).then((e=>(i(...e),r)))}}define(["./workbox-0f370d1d"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/index-31d39227.js",revision:null},{url:"assets/index-5265c558.css",revision:null},{url:"assets/kernel-7232a489.js",revision:null},{url:"assets/system/Composer-819399bd.js",revision:null},{url:"assets/system/Composer/components-eca8f740.js",revision:null},{url:"assets/system/Composer/hooks-df2dd760.js",revision:null},{url:"assets/system/Converter-43cbe3f8.js",revision:null},{url:"assets/system/Materials-16fdd2cf.js",revision:null},{url:"assets/vendor-6f7c0435.js",revision:null},{url:"catalog/camisa-polo/cleaned.svg",revision:"2a035da823f93530e89d7f2c6208a738"},{url:"catalog/camisa-polo/decorated.svg",revision:"e57aa0628791af156f536e74528dacdc"},{url:"catalog/camisa-polo/model.json",revision:"294239885bc5cf101a694a4eaaa0dd57"},{url:"catalog/camisa-polo/processed.svg",revision:"d6675963fc57a0531eb31df049a40034"},{url:"catalog/camiseta-fem/meta.json",revision:"c81ad7347b9914720c9dd18e8ae640a5"},{url:"catalog/camiseta-fem/modelo.svg",revision:"acc8a0867d8ebacf85711ee43b684ff6"},{url:"favicon.ico",revision:"33f82a8624804deb12b8bff4e774fb71"},{url:"logo192.png",revision:"5a60411726275fc4f53901dc0e0a8799"},{url:"logo512.png",revision:"6604f1b97a99363e21fd9047106a43bd"},{url:"manifest.json",revision:"77245cf7c3662758fc85870aa9cae613"},{url:"robots.txt",revision:"fa1ded1ed7c11438a9b0385b1e112850"},{url:"manifest.webmanifest",revision:"ad28a3201d0f1391e5588f216fc79602"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html"))),e.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts-cache",plugins:[new e.ExpirationPlugin({maxEntries:10,maxAgeSeconds:31536e3}),new e.CacheableResponsePlugin({statuses:[0,200]})]}),"GET")}));