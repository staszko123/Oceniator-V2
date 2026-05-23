export function initPremiumShell(){
  movePremiumCssToEnd();
  installMobileNavigation();
  installLoginInertGuard();
  renderPremiumIcons();
  wrapThemeToggle();
}

function movePremiumCssToEnd(){
  var link=document.getElementById('premium-rebuild-css');
  if(link) document.head.appendChild(link);
}

function icon(name){
  var paths={
    logo:'<path d="M7 4h10a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h6"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>',
    phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.3 19.3 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9Z"/>',
    mail:'<path d="M4 5h16v14H4z"/><path d="m4 7 8 6 8-6"/>',
    monitor:'<path d="M4 5h16v11H4z"/><path d="M9 21h6M12 16v5"/>',
    team:'<path d="M16 11a4 4 0 1 0-8 0"/><path d="M3.5 20a8.5 8.5 0 0 1 17 0"/><path d="M19 8a3 3 0 0 1 2 2.8M5 8a3 3 0 0 0-2 2.8"/>',
    chart:'<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-4M12 15V8M16 15v-7"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    report:'<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5"/><path d="M9 16v-4M12 16V9M15 16v-2"/>',
    clipboard:'<path d="M9 4h6l1 2h3v15H5V6h3Z"/><path d="M9 4a3 3 0 0 1 6 0"/><path d="M9 11h6M9 15h4"/>',
    settings:'<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/>',
    moon:'<path d="M21 14.7A8 8 0 0 1 9.3 3 7 7 0 1 0 21 14.7Z"/>',
    link:'<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/>',
    reset:'<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/>',
    target:'<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/><path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
    arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[name]||paths.list)+'</svg>';
}

function setIcon(selector,name){
  var el=document.querySelector(selector);
  if(el) el.innerHTML=icon(name);
}

function renderPremiumIcons(){
  var nav={
    '#sbi-start .sb-icon':'home',
    '#sbi-rozmowy .sb-icon':'phone',
    '#sbi-maile .sb-icon':'mail',
    '#sbi-systemy .sb-icon':'monitor',
    '#sbi-myteam .sb-icon':'team',
    '#sbi-dashboard .sb-icon':'chart',
    '#sbi-ewidencja .sb-icon':'list',
    '#sbi-raporty .sb-icon':'report',
    '#sbi-admin .sb-icon':'settings'
  };
  Object.keys(nav).forEach(function(selector){setIcon(selector,nav[selector]);});
  setIcon('.sb-logo','logo');
  setIcon('#theme-icon','moon');
  setIcon('.sb-fbtn[onclick*="sp-modal"] .sb-icon','link');
  setIcon('.sb-fbtn[onclick*="confirmReset"] .sb-icon','reset');
  setIcon('.start-welcome-icon','target');
  setIcon('.footer-icon','shield');
  setIcon('.activity-empty-icon','clipboard');
  setIcon('.stat-card:nth-child(1) .stat-icon','chart');
  setIcon('.stat-card:nth-child(2) .stat-icon','report');
  setIcon('.stat-card:nth-child(3) .stat-icon','clipboard');
  setIcon('.action-btn:nth-child(1) .action-icon','phone');
  setIcon('.action-btn:nth-child(2) .action-icon','mail');
  setIcon('.action-btn:nth-child(3) .action-icon','monitor');
  setIcon('.quick-link:nth-child(1) .quick-icon','list');
  setIcon('.quick-link:nth-child(2) .quick-icon','chart');
  setIcon('.quick-link:nth-child(3) .quick-icon','report');
  document.querySelectorAll('.action-arrow').forEach(function(el){el.innerHTML=icon('arrow');});
}

function installMobileNavigation(){
  var pageBar=document.querySelector('.page-bar');
  var sidebar=document.getElementById('sidebar');
  if(!pageBar||!sidebar) return;

  if(!document.getElementById('mobile-menu-btn')){
    var btn=document.createElement('button');
    btn.id='mobile-menu-btn';
    btn.className='mobile-menu-btn';
    btn.type='button';
    btn.setAttribute('aria-label','Otworz nawigacje');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML=icon('menu');
    btn.addEventListener('click',function(){
      var open=!document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open',open);
      btn.setAttribute('aria-expanded',String(open));
    });
    pageBar.insertBefore(btn,pageBar.firstChild);
  }

  if(!document.getElementById('sidebar-scrim')){
    var scrim=document.createElement('div');
    scrim.id='sidebar-scrim';
    scrim.className='sidebar-scrim';
    scrim.addEventListener('click',closeMobileNav);
    document.body.appendChild(scrim);
  }

  sidebar.querySelectorAll('.sb-item').forEach(function(item){
    item.addEventListener('click',closeMobileNav);
  });

  document.addEventListener('keydown',function(event){
    if(event.key==='Escape') closeMobileNav();
  });
}

function closeMobileNav(){
  document.body.classList.remove('nav-open');
  var btn=document.getElementById('mobile-menu-btn');
  if(btn) btn.setAttribute('aria-expanded','false');
}

function installLoginInertGuard(){
  function sync(){
    var app=document.querySelector('.app');
    if(!app) return;
    var hasLogin=!!document.getElementById('oc-login-screen');
    if(hasLogin){
      app.setAttribute('aria-hidden','true');
      app.setAttribute('inert','');
    }else{
      app.removeAttribute('aria-hidden');
      app.removeAttribute('inert');
    }
  }
  sync();
  var observer=new MutationObserver(sync);
  observer.observe(document.body,{childList:true,subtree:false});
}

function wrapThemeToggle(){
  if(typeof window.toggleTheme!=='function'||window.__premiumThemeWrapped) return;
  var original=window.toggleTheme;
  window.__premiumThemeWrapped=true;
  window.toggleTheme=function(){
    original.apply(this,arguments);
    setTimeout(renderPremiumIcons,0);
  };
}
