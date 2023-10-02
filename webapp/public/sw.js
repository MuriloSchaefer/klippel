const addResourcesToCache = async (cacheName, resources) => {
  const cache = await caches.open(cacheName);
  await cache.addAll(resources);
};

self.addEventListener('install', (event) => {
  console.log(`${version} installing...`);

//   event.waitUntil(
//     addResourcesToCache([
//       '/',
//       '/index.html',
//       '/styles.css',
//       '/script.js',
//       '/jungle.png',
//     ])
//   );
});