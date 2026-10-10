/* =====================================================================
   Modul 47 · Sicherheit                     (Update 23)

   Admin: Zugang zurücksetzen
   Ersetzt die frühere PIN-Wiederherstellung für Berater ohne E-Mail.
   Ablauf:
     1. In der Firebase Console unter Authentication den Zugang des
        Beraters löschen (Suche nach der DK-Nummer, z. B. dk12345678).
     2. Hier die DK-Nummer eintragen und "Zugang zurücksetzen" tippen.
        Damit wird die Verknüpfung zum alten Zugang gelöst.
     3. Der Berater registriert sich mit derselben DK-Nummer und demselben
        Namen neu. Seine Daten bleiben vollständig erhalten.
   ===================================================================== */
(function(){
  "use strict";

  function blockBauen(){
    const box = document.getElementById('profil');
    if(!box || box.querySelector('#szReset')) return;
    if(typeof me === "undefined" || !me || typeof istAdmin !== "function" || !istAdmin()) return;

    const a = document.createElement('div');
    a.className = 'asec'; a.id = 'szReset';
    a.innerHTML = `<h3>Zugang zurücksetzen</h3>
      <p class="sub">Für Berater ohne hinterlegte E-Mail, die ihr Passwort vergessen haben.</p>
      <div class="grp">
        ${fld("szDk","DK-Nummer","","text",'autocomplete="off" spellcheck="false" placeholder="DK00000000"')}
      </div>
      <p class="hinweis">Vorher in der Firebase Console unter <b>Authentication</b> den Zugang
        dieser DK-Nummer löschen. Danach registriert sich der Berater mit derselben DK-Nummer
        und demselben Namen neu — alle Daten bleiben erhalten.</p>
      <p class="err" id="szErr" hidden></p>
      <div class="actions"><button class="btn" id="szGo">Zugang zurücksetzen</button></div>`;
    box.appendChild(a);

    a.querySelector('#szGo').onclick = async ()=>{
      const err = a.querySelector('#szErr');
      const zeig = (t, ok) => { err.textContent = t; err.hidden = !t; err.classList.toggle('ok', !!ok); };
      const dk = a.querySelector('#szDk').value.trim().toUpperCase().replace(/\s/g,"");
      zeig("");
      if(!DK_RE.test(dk)) return zeig("Die DK-Nummer besteht aus DK und acht Ziffern.");
      if(dk === me.dk)    return zeig("Den eigenen Zugang kannst du hier nicht zurücksetzen.");
      let u;
      try{ u = await userGet(dk); }catch(e){ return zeig("Keine Verbindung zur Datenbank."); }
      if(!u) return zeig("Zu dieser DK-Nummer gibt es keinen Datensatz.");
      if(!u.uid) return zeig(`${u.vorname} ${u.nachname} kann sich bereits neu registrieren.`, true);
      try{
        await db.ref('uids/'+u.uid).remove();
        await db.ref('users/'+dk+'/uid').remove();
        zeig(`Erledigt. ${u.vorname} ${u.nachname} kann sich jetzt mit ${dk} neu registrieren.`, true);
      }catch(e){ zeig("Nicht zurückgesetzt: " + (e.message || e)); }
    };
  }

  if(typeof window.renderProfil === "function"){
    const renderProfilOhneSZ = window.renderProfil;
    window.renderProfil = async function(){
      const r = await renderProfilOhneSZ.apply(this, arguments);
      try{ blockBauen(); }catch(e){}
      return r;
    };
  }
})();

/* Untere Leiste am Handy: "Mehr" öffnet das vollständige Menü.
   (stand bis Update 22 als Inline-Skript in der index.html - die neuen
   Sicherheitsregeln des Browsers erlauben keine Inline-Skripte mehr) */
(function(){
  const m = document.getElementById("tabMehr"), b = document.getElementById("burger");
  if(m && b) m.onclick = () => b.click();
})();
