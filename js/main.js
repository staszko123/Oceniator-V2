initTheme();
loadRegistry();
loadAdminData();
if(!DataStore.isRemote || !DataStore.isRemote()){
  installDemoData(false);
  if(registry.length===0){seedTestData();seedAdminFromRegistry();}
}
restoreDraftsOnBoot();
['r','m','s'].forEach(buildForm);
buildEwidencjaTab();
const today=new Date().toISOString().split('T')[0];
const bootDrafts=getDrafts();
['r','m','s'].forEach(p=>{
  const d=document.getElementById(`${p}-data`);
  if(d&&!formHasContent(bootDrafts[p])) d.value=today;
  recalc(p);
  refreshSpecContext(p);
});
draftDirty=Object.values(bootDrafts).some(formHasContent);
updateDraftStartButton();
updateRoleBadge();

function lockUntilAuth(){
  if(window.currentUserData) return;
  normalizeAdminData(); // gwarantuje że adminData.access istnieje
  adminData.access.role='viewer';
  window.currentRole='viewer';
  updateRoleBadge();
}
function showAuthBootError(){
  lockUntilAuth();
  var old=document.getElementById('oc-auth-boot-error');
  if(old) old.remove();
  var box=document.createElement('div');
  box.id='oc-auth-boot-error';
  box.style.cssText='position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.92);font-family:Poppins,Arial,sans-serif;padding:24px';
  box.innerHTML='<div style="max-width:460px;background:#fff;color:#0f172a;border-radius:18px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.35)"><div style="font-size:18px;font-weight:800;margin-bottom:8px">Nie udało się uruchomić logowania</div><div style="font-size:13px;line-height:1.65;color:#475569">Aplikacja została zablokowana do czasu odświeżenia strony. Jeśli problem wróci, wyczyść dane tej strony w przeglądarce i spróbuj ponownie.</div><button onclick="location.reload()" style="margin-top:16px;border:0;border-radius:10px;background:#0D9488;color:#fff;font-weight:800;padding:10px 14px;cursor:pointer">Odśwież</button></div>';
  document.body.appendChild(box);
}
lockUntilAuth();

function chartAvailable(target,message){
  if(typeof Chart!=='undefined') return true;
  var el=typeof target==='string'?document.getElementById(target):target;
  var holder=el&&el.parentElement?el.parentElement:el;
  if(holder){
    holder.innerHTML='<div style="display:flex;align-items:center;justify-content:center;min-height:180px;padding:18px;text-align:center;color:var(--text3);font-size:12px;line-height:1.6">Wykres jest chwilowo niedostępny. Dane tabelaryczne pozostają dostępne.'+(message?' '+message:'')+'</div>';
  }
  return false;
}

(function(){
  const add=(id,href)=>{
    if(!document.getElementById(id)){
      const link=document.createElement('link');
      link.id=id;
      link.rel='stylesheet';
      link.href=href;
      document.head.appendChild(link);
    }
  };
  add('theme-overrides-css','css/theme-overrides.css');
  add('score-sidebar-css','css/score-sidebar.css');
  add('hybrid-css','css/hybrid-mode.css');
  add('forms-saas-css','css/forms-saas.css');
  add('dark-premium-css','css/dark-premium.css');
  add('ew-actions-css','css/ewidencja-actions.css');
  add('ew-premium-css','css/ewidencja-premium.css');
  add('forms-ux-css','css/forms-ux-spacing.css');
  add('spec-search-css','css/specialist-search.css');
  add('login-mobile-css','css/login-mobile.css');
  add('spec-profile-css','css/spec-profile.css');
  add('skills-css','css/skills.css');
  add('premium-rebuild-css','css/premium-rebuild.css');
})();

function enterApp(tab){switchTab(tab||'rozmowy');}

document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){
    e.preventDefault();
    ['r','m','s'].forEach(function(p){
      const panel=document.getElementById('tab-'+{r:'rozmowy',m:'maile',s:'systemy'}[p]);
      if(panel&&panel.classList.contains('on')) saveDraft(p);
    });
  }
});

setInterval(function(){
  ['r','m','s'].forEach(function(p){
    const panel=document.getElementById('tab-'+{r:'rozmowy',m:'maile',s:'systemy'}[p]);
    if(panel&&panel.classList.contains('on')) saveDraft(p);
  });
},30000);

import('./skills/skill-engine.js').then(function(mod){if(mod&&mod.initSkills) mod.initSkills();}).catch(function(err){console.error('Błąd skilli',err);});
import('./auth-module.js').then(function(mod){if(mod&&mod.authInit) mod.authInit();}).catch(function(err){console.error('Błąd modułu logowania',err);showAuthBootError();});
import('./hybrid-mode.js').then(function(mod){if(mod&&mod.initHybrid) mod.initHybrid();}).catch(function(err){console.error('Błąd hybrid mode',err);});
import('./layout-adjustments.js').then(function(mod){if(mod&&mod.initLayoutAdjustments) mod.initLayoutAdjustments();}).catch(function(err){console.error('Błąd layout',err);});
import('./ewidencja-actions.js').then(function(mod){if(mod&&mod.initEwidencjaActions) mod.initEwidencjaActions();}).catch(function(err){console.error('Błąd ewidencja actions',err);});
import('./ewidencja-premium.js').then(function(mod){if(mod&&mod.initEwidencjaPremium) mod.initEwidencjaPremium();}).catch(function(err){console.error('Błąd ewidencja premium',err);});
import('./specialist-search.js').then(function(mod){if(mod&&mod.initSpecialistSearch) mod.initSpecialistSearch();});
import('./spec-profile.js').then(function(mod){if(mod&&mod.initSpecProfile) mod.initSpecProfile();});
import('./start-dashboard.js').then(function(mod){if(mod&&mod.initStartDashboard) mod.initStartDashboard();}).catch(function(err){console.error('Błąd start dashboard',err);});
import('./copyright.js').then(function(mod){if(mod&&mod.initCopyright) mod.initCopyright();});
import('./premium-shell.js').then(function(mod){if(mod&&mod.initPremiumShell) mod.initPremiumShell();}).catch(function(err){console.error('Błąd premium shell',err);});
