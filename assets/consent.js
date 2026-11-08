/* deeday.ng: Google Analytics, loaded only after the visitor accepts. */
(function(){
  var GTAG_ID = "GTM-NGPMTHGD";
  var KEY = "deeday-consent";
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;

  function load(){
    if (window.__ddGa) return; window.__ddGa = true;
    gtag("consent","default",{analytics_storage:"granted",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
    gtag("js", new Date());
    var s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtm.js?id=" + GTAG_ID;
    document.head.appendChild(s);
  }

  function banner(){
    if (document.getElementById("dd-consent")) return;
    var css = document.createElement("style");
    css.textContent = "#dd-consent{position:fixed;left:12px;right:12px;bottom:96px;z-index:9999;max-width:520px;margin:0 auto;background:#1E1214;color:#F4EAE7;border-radius:18px;padding:16px 18px;font:500 .88rem/1.5 'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;box-shadow:0 18px 40px -12px rgba(0,0,0,.45)}#dd-consent a{color:#F2BFC7}#dd-consent .b{display:flex;gap:8px;margin-top:12px}#dd-consent button{flex:1;border:0;border-radius:30px;padding:10px 14px;font:700 .85rem 'Plus Jakarta Sans',system-ui,sans-serif;cursor:pointer}#dd-consent .y{background:#C24A58;color:#fff}#dd-consent .n{background:transparent;color:#F4EAE7;border:1px solid #5a4446}@media(min-width:900px){#dd-consent{bottom:20px}}";
    document.head.appendChild(css);
    var d = document.createElement("div");
    d.id = "dd-consent"; d.setAttribute("role","dialog"); d.setAttribute("aria-label","Cookie choice");
    d.innerHTML = "We use Google Analytics cookies to see which pages help couples most. No ads, and we never sell your data. <a href=\"/privacy\">Privacy Policy</a><div class=\"b\"><button class=\"n\" type=\"button\">No thanks</button><button class=\"y\" type=\"button\">Accept</button></div>";
    document.body.appendChild(d);
    d.querySelector(".y").onclick = function(){ try{localStorage.setItem(KEY,"yes")}catch(e){} d.remove(); load(); };
    d.querySelector(".n").onclick = function(){ try{localStorage.setItem(KEY,"no")}catch(e){} d.remove(); };
  }

  /* lets the privacy page reopen the choice */
  window.ddCookieChoice = function(){ try{localStorage.removeItem(KEY)}catch(e){} banner(); };

  var c = null; try{ c = localStorage.getItem(KEY); }catch(e){}
  if (c === "yes") load();
  else if (c !== "no") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner); else banner();
  }
})();
