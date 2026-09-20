/* Digitaler Businessplan – Offlinebetrieb
   VERSION bei jedem Hochladen um eins erhöhen. Der Rest läuft von allein:
   das Gerüst kommt sofort aus dem Zwischenspeicher und wird im Hintergrund
   erneuert, die Daten holt immer Firebase. */
const VERSION = "dbp-v1";
const DATEIEN = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/app.css",
  "./css/ui.css",
  "./js/01-konstanten.js",
  "./js/02-datum.js",
  "./js/03-daten.js",
  "./js/04-raster.js",
  "./js/05-dialog.js",
  "./js/06-nachbereitung.js",
  "./js/07-potenzial.js",
  "./js/08-wiedervorlage.js",
  "./js/09-dialogschritte.js",
  "./js/10-statistik.js",
  "./js/11-druck.js",
  "./js/12-vertriebsmonat-provision.js",
  "./js/13-provisionsrechner.js",
  "./js/14-provisionswunsch.js",
  "./js/15-auswertungen.js",
  "./js/16-cloud-konto.js",
  "./js/17-anmeldung.js",
  "./js/18-teamansicht.js",
  "./js/19-profil.js",
  "./js/20-wochenmeldung.js",
  "./js/21-adresse.js",
  "./js/22-inventur.js",
  "./js/23-ziele-jobtickets.js",
  "./js/24-team-wochenmeldung.js",
  "./js/25-fahrtenbuch.js",
  "./js/26-kundenliste.js",
  "./js/27-abgleich-menue.js",
  "./js/28-heute.js",
  "./js/29-jahresrueckblick.js",
  "./js/30-zaehlen.js",
  "./js/31-hilfe.js",
  "./js/32-start.js"
];

self.addEventListener("install", ev=>{
  self.skipWaiting();
  ev.waitUntil(caches.open(VERSION).then(c=>c.addAll(DATEIEN)).catch(()=>{}));
});
self.addEventListener("activate", ev=>{
  ev.waitUntil(caches.keys().then(keys=>
    Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("message", ev=>{ if(ev.data === "uebernehmen") self.skipWaiting(); });

self.addEventListener("fetch", ev=>{
  const url = new URL(ev.request.url);
  if(ev.request.method !== "GET") return;
  /* Firebase, Schriften und Adresssuche nie aus dem Zwischenspeicher bedienen */
  if(url.hostname.includes("firebase") || url.hostname.includes("google") ||
     url.hostname.includes("gstatic") || url.hostname.includes("komoot") ||
     url.hostname.includes("workers.dev")) return;

  const eigen = url.origin === location.origin;
  if(eigen){
    /* Gerüst: erst aus dem Speicher ausliefern, dann im Hintergrund erneuern */
    ev.respondWith(caches.match(ev.request).then(treffer=>{
      const frisch = fetch(ev.request).then(r=>{
        const kopie = r.clone();
        caches.open(VERSION).then(c=>c.put(ev.request, kopie)).catch(()=>{});
        return r;
      }).catch(()=> treffer || caches.match("./index.html"));
      return treffer || frisch;
    }));
    return;
  }
  ev.respondWith(fetch(ev.request).catch(()=> caches.match(ev.request)));
});
