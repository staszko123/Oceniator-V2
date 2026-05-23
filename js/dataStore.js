/* ══════════════════════════════════════════════
   DATA STORE
   Jedna warstwa dostępu do danych aplikacji.
   Obecnie działa synchronicznie na localStorage.
   Struktura jest przygotowana pod dalsze podpięcie Supabase.
══════════════════════════════════════════════ */

var DataStore = (function(){
  var keys = {
    registry: 'pep_registry_v5',
    admin: 'pep_admin_v1',
    drafts: 'pep_form_drafts_v1',
    theme: 'pep_theme',
    goal: 'pep_goal',
    savedAssessor: 'pep_saved_oce',
    sidebarCollapsed: 'pep_sb_collapsed'
  };

  function cfg(){
    return window.OCENIATOR_SUPABASE || {url:'',anonKey:'',enabled:false};
  }

  function remoteEnabled(){
    var c = cfg();
    return !!(c.enabled && c.url && c.anonKey && window.supabase);
  }

  // ── Cache layer dla Supabase fallback ──
  var cache = {
    profiles: { data: null, ts: 0 },
    admin: { data: null, ts: 0 },
    registry: { data: null, ts: 0 }
  };
  var CACHE_TTL = 300000; // 5 minut

  function isCacheValid(key){
    return cache[key] && cache[key].data && (Date.now() - cache[key].ts) < CACHE_TTL;
  }

  function setCache(key, data){
    cache[key] = { data: data, ts: Date.now() };
  }

  function getCache(key){
    return isCacheValid(key) ? cache[key].data : null;
  }

  function isSupabaseHealthy(){
    if(!remoteEnabled()) return false;
    // Prosty healthcheck — czy można się połączyć
    return !!(window._sb && window._sb.auth);
  }

  function readJson(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  }

  function writeJson(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(e){
      return false;
    }
  }

  function getValue(key, fallback){
    try{
      var value = localStorage.getItem(key);
      return value == null ? fallback : value;
    }catch(e){
      return fallback;
    }
  }

  function setValue(key, value){
    try{
      if(value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(value));
      return true;
    }catch(e){
      return false;
    }
  }

  function isUuid(value){
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  function fallbackUuid(value){
    var text = String(value || Date.now());
    var hash = 0x811c9dc5;
    for(var i=0;i<text.length;i++){
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    var hex = ('00000000' + hash.toString(16)).slice(-8);
    return hex + '-0000-4000-8000-' + ('000000000000' + hex + hex).slice(-12);
  }

  function entryId(e){
    if(e && isUuid(e.id)) return e.id;
    if(window.crypto && window.crypto.randomUUID && e && !e.id){
      e.id = window.crypto.randomUUID();
      return e.id;
    }
    return fallbackUuid(e && e.id);
  }

  function entryNotesJson(e){
    return {
      general: e && typeof e.notes === 'string' ? e.notes : '',
      perContact: e && e.snapshotNotes ? e.snapshotNotes : ((e && typeof e.notes === 'object') ? e.notes : {})
    };
  }

  // ── Konwersja: wpis registry → wiersz tabeli assessments ──
  function entryToRow(e){
    return {
      id:             entryId(e),
      type:           e.p || e.type || 'r',
      spec:           e.spec || '',
      stand:          e.stand || '',
      dzial:          e.dzial || '',
      oce:            e.oce || '',
      assessment_date:e.data || new Date().toISOString().split('T')[0],
      period:         e.period || '',
      avg_final:      e.avgFinal || 0,
      rating:         e.rating || '',
      scores:         e.snapshotScores || e.scores || {},
      gold:           e.gold || [],
      contact_ids:    e.ids || [],
      notes:          entryNotesJson(e),
      gold_desc:      e.goldDesc || '',
      contact_count:  e.contactCount || e.count || 3,
      status:         e.status || 'submitted',
      status_history: e.statusHistory || [],
      archived_at:    e.archivedAt || null,
      leader_scope:   e.oce || '',   // oce = lider który oceniał = scope
      created_by:     null
    };
  }

  // ── Konwersja: wiersz assessments → wpis registry ──
  function rowToEntry(r){
    var notes = r.notes || {};
    return {
      id:            r.id,
      p:             r.type,
      type:          r.type,
      spec:          r.spec,
      stand:         r.stand,
      dzial:         r.dzial,
      oce:           r.oce,
      data:          r.assessment_date,
      period:        r.period,
      avgFinal:      r.avg_final,
      rating:        r.rating,
      snapshotScores:r.scores || {},
      gold:          r.gold || [],
      ids:           r.contact_ids || [],
      notes:         typeof notes.general === 'string' ? notes.general : '',
      snapshotNotes: notes.perContact || {},
      goldDesc:      r.gold_desc || '',
      contactCount:  r.contact_count || 3,
      count:         r.contact_count || 3,
      status:        r.status,
      statusHistory: r.status_history || [],
      archivedAt:    r.archived_at || undefined,
      locked:        r.status === 'approved' || r.status === 'archived',
      archived:      r.status === 'archived'
    };
  }

  // ── Pobierz registry z Supabase (async) ──
  function fetchRegistryFromSupabase(){
    if(!remoteEnabled()) return Promise.resolve(null);
    
    // Zwróć cache jeśli jest ważny
    var cached = getCache('registry');
    if(cached) return Promise.resolve(cached);
    
    return window._sb
      .from('assessments')
      .select('*')
      .order('assessment_date', {ascending: false})
      .then(function(res){
        if(res.error){ console.warn('[DataStore] fetchRegistry:', res.error.message); return null; }
        var data = (res.data || []).map(rowToEntry);
        setCache('registry', data);
        writeJson('pep_supabase_registry_backup', data);
        return data;
      })
      .catch(function(e){ 
        console.warn('[DataStore] Nie udało się pobrać kart z Supabase:', e.message);
        // Fallback do cache
        if(cache.registry.data) {
          console.log('[DataStore] Używam cache kart (offline/timeout)');
          return cache.registry.data;
        }
        // Fallback do localStorage
        var localBackup = readJson('pep_supabase_registry_backup', null);
        if(localBackup) {
          console.log('[DataStore] Fallback do localStorage kart');
          return localBackup;
        }
        return null;
      });
  }

  // ── Wypchnij registry do Supabase (async, upsert) ──
  function pushRegistryToSupabase(data){
    if(!remoteEnabled() || !Array.isArray(data) || !data.length) return Promise.resolve();
    var rows = data.map(entryToRow);
    return window._sb
      .from('assessments')
      .upsert(rows, {onConflict: 'id'})
      .then(function(res){
        if(res.error) console.warn('[DataStore] pushRegistry:', res.error.message);
      })
      .catch(function(e){ console.warn('[DataStore] pushRegistry wyjątek:', e); });
  }

  function deleteRegistryEntryFromSupabase(id){
    if(!remoteEnabled() || !id) return Promise.resolve();
    return window._sb
      .from('assessments')
      .delete()
      .eq('id', id)
      .then(function(res){
        if(res.error) throw res.error;
      });
  }

  // ── Pobierz adminData z Supabase (async) ──
  function fetchAdminFromSupabase(){
    if(!remoteEnabled()) return Promise.resolve(null);
    
    // Zwróć cache jeśli jest ważny
    var cached = getCache('admin');
    if(cached) return Promise.resolve(cached);
    
    return Promise.all([
      window._sb.from('goals').select('*').eq('id','00000000-0000-0000-0000-000000000001').single(),
      window._sb.from('specialists').select('*').order('sort_order'),
      window._sb.from('departments').select('*').order('sort_order'),
      window._sb.from('positions').select('*').order('sort_order'),
      window._sb.from('periods').select('*').order('sort_order'),
      window._sb.from('admin_history').select('*').order('changed_at',{ascending:false}).limit(200)
    ]).then(function(results){
      var goals    = results[0].data;
      var specs    = results[1].data || [];
      var depts    = results[2].data || [];
      var positions= results[3].data || [];
      var periods  = results[4].data || [];
      var history  = results[5].data || [];

      var adminData = {
        goals: goals ? {
          callsPerPeriod:   goals.calls_per_period,
          mailsPerPeriod:   goals.mails_per_period,
          systemsPerPeriod: goals.systems_per_period,
          minAvg:           goals.min_avg,
          greatShare:       goals.great_share
        } : null,
        specialists: specs.filter(function(s){ return s.is_active !== false; }).map(function(s){ return s.name; }),
        departments: depts.filter(function(d){ return d.is_active !== false; }).map(function(d){ return d.name; }),
        positions:   positions.filter(function(p){ return p.is_active !== false; }).map(function(p){ return p.name; }),
        people:      specs.map(function(s){
          return { id: s.id, name: s.name, leader: s.leader_scope, department: s.department, position: s.position, active: s.is_active !== false };
        }),
        periods: periods.map(function(p){
          return { code: p.code, name: p.name, from: p.date_from, to: p.date_to };
        }),
        history: history.map(function(h){
          return { desc: h.description, ts: h.changed_at };
        })
      };
      
      setCache('admin', adminData);
      writeJson('pep_supabase_admin_backup', adminData);
      return adminData;
    }).catch(function(e){ 
      console.warn('[DataStore] Nie udało się pobrać config z Supabase:', e.message);
      // Fallback do cache
      if(cache.admin.data) {
        console.log('[DataStore] Używam cache config (offline/timeout)');
        return cache.admin.data;
      }
      // Fallback do localStorage
      var localBackup = readJson('pep_supabase_admin_backup', null);
      if(localBackup) {
        console.log('[DataStore] Fallback do localStorage config');
        return localBackup;
      }
      return null;
    });
  }

  function fetchProfilesFromSupabase(){
    if(!remoteEnabled()) return Promise.resolve([]);
    
    // Najpierw zwróć cache jeśli jest ważny
    var cached = getCache('profiles');
    if(cached) return Promise.resolve(cached);
    
    return window._sb
      .from('profiles')
      .select('id,email,full_name,role,leader_scope,is_active,created_at,updated_at')
      .order('email', {ascending: true})
      .then(function(res){
        if(res.error) throw res.error;
        var data = res.data || [];
        setCache('profiles', data);
        return data;
      })
      .catch(function(e){
        console.warn('[DataStore] Nie udało się pobrać profili z Supabase:', e.message);
        // Fallback do cache starszego niż TTL
        if(cache.profiles.data) {
          console.log('[DataStore] Używam cache profili (offline/timeout)');
          return cache.profiles.data;
        }
        // Ostatni fallback — próba czytania z localStorage
        var localBackup = readJson('pep_supabase_profiles_backup', []);
        if(localBackup.length) {
          console.log('[DataStore] Fallback do localStorage profili');
          return localBackup;
        }
        return [];
      });
  }

  function updateProfileInSupabase(profile){
    if(!remoteEnabled() || !profile || !profile.id) return Promise.resolve();
    if(window._sb && typeof window._sb.rpc === 'function'){
      return window._sb.rpc('admin_update_profile', {
        target_id: profile.id,
        target_full_name: profile.full_name || '',
        target_role: profile.role || 'viewer',
        target_leader_scope: profile.leader_scope || '',
        target_is_active: profile.is_active !== false
      }).then(function(res){
        if(res.error) throw res.error;
        var data = Array.isArray(res.data) ? res.data[0] : res.data;
        if(!data) throw new Error('Supabase RPC nie zwróciło zapisanego profilu.');
        return data;
      });
    }
    return window._sb
      .from('profiles')
      .update({
        full_name: profile.full_name || '',
        role: profile.role || 'viewer',
        leader_scope: profile.leader_scope || null,
        is_active: profile.is_active !== false
      })
      .eq('id', profile.id)
      .select('id,email,full_name,role,leader_scope,is_active,created_at,updated_at')
      .single()
      .then(function(res){
        if(res.error) throw res.error;
        if(!res.data) throw new Error('Supabase nie zwróciło zapisanego profilu.');
        return res.data;
      });
  }

  function createProfileInSupabase(profile){
    if(!remoteEnabled()) return Promise.reject(new Error('Supabase jest wyłączone.'));
    if(!window._sb || !window.OCENIATOR_SUPABASE) return Promise.reject(new Error('Brak konfiguracji Supabase.'));
    var cfg = window.OCENIATOR_SUPABASE;
    return window._sb.auth.getSession().then(function(sessionRes){
      var token = sessionRes && sessionRes.data && sessionRes.data.session && sessionRes.data.session.access_token;
      if(!token) throw new Error('Brak aktywnej sesji Supabase.');
      return fetch(String(cfg.url).replace(/\/$/,'') + '/functions/v1/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.anonKey,
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          email: profile.email || '',
          password: profile.password || '',
          full_name: profile.full_name || '',
          role: profile.role || 'viewer',
          leader_scope: profile.leader_scope || '',
          is_active: profile.is_active !== false
        })
      });
    }).then(function(resp){
      return resp.json().catch(function(){return {};}).then(function(data){
        if(!resp.ok) throw new Error(data.error || ('Supabase Edge Function HTTP ' + resp.status));
        return data;
      });
    });
  }

  function pushAdminToSupabase(data){
    if(!remoteEnabled() || !data || !window.currentUserData) return Promise.resolve();
    var goals = data.goals || {};
    var people = Array.isArray(data.people) ? data.people : [];
    var departments = (data.departments || []).map(function(name, i){
      return { name: name, is_active: true, sort_order: i };
    });
    var positions = (data.positions || []).map(function(name, i){
      return { name: name, is_active: true, sort_order: i };
    });
    var specialists = people.filter(function(p){ return p && p.name; }).map(function(p, i){
      return {
        name: p.name,
        leader_scope: p.leader || '',
        department: p.department || '',
        position: p.position || '',
        is_active: p.active !== false,
        sort_order: i
      };
    });
    var periods = (data.periods || []).map(function(p, i){
      return {
        code: p.code || ('P' + (i + 1)),
        name: p.name || p.code || ('P' + (i + 1)),
        date_from: p.from || p.date_from || '01-01',
        date_to: p.to || p.date_to || '12-31',
        sort_order: i
      };
    });
    return Promise.all([
      window._sb.from('goals').update({
        calls_per_period: goals.callsPerPeriod || 9,
        mails_per_period: goals.mailsPerPeriod || goals.callsPerPeriod || 9,
        systems_per_period: goals.systemsPerPeriod || goals.callsPerPeriod || 9,
        min_avg: goals.minAvg || 92,
        great_share: goals.greatShare || 60
      }).eq('id','00000000-0000-0000-0000-000000000001'),
      departments.length ? window._sb.from('departments').upsert(departments, { onConflict: 'name' }) : Promise.resolve({}),
      positions.length ? window._sb.from('positions').upsert(positions, { onConflict: 'name' }) : Promise.resolve({}),
      specialists.length ? window._sb.from('specialists').upsert(specialists, { onConflict: 'name' }) : Promise.resolve({}),
      periods.length ? window._sb.from('periods').upsert(periods, { onConflict: 'code' }) : Promise.resolve({})
    ]).then(function(results){
      results.forEach(function(res){
        if(res && res.error) console.warn('[DataStore] pushAdmin:', res.error.message);
      });
    }).catch(function(e){ console.warn('[DataStore] pushAdmin wyjątek:', e); });
  }

  function localMigrationStatus(){
    var localRegistry = readJson(keys.registry, []);
    var localAdmin = readJson(keys.admin, null);
    return {
      registryCount: Array.isArray(localRegistry) ? localRegistry.length : 0,
      hasAdmin: !!localAdmin,
      hasUsers: !!getValue('oc_users_v1', ''),
      hasLocalSession: !!getValue('oc_session_v1', '')
    };
  }

  function clearLocalProductionData(){
    [
      keys.registry,
      keys.admin,
      keys.goal,
      keys.savedAssessor,
      'oc_users_v1',
      'oc_session_v1'
    ].forEach(function(key){ setValue(key, null); });
    return true;
  }

  function migrateLocalToSupabase(){
    if(!remoteEnabled()) return Promise.reject(new Error('Supabase jest wyłączone.'));
    var localRegistry = readJson(keys.registry, []);
    var localAdmin = readJson(keys.admin, null);
    return Promise.all([
      localAdmin ? pushAdminToSupabase(localAdmin) : Promise.resolve(),
      Array.isArray(localRegistry) && localRegistry.length ? pushRegistryToSupabase(localRegistry) : Promise.resolve()
    ]).then(function(){
      return {
        registryCount: Array.isArray(localRegistry) ? localRegistry.length : 0,
        hasAdmin: !!localAdmin
      };
    });
  }

  return {
    keys: keys,
    isRemote: remoteEnabled,

    // ── Registry ──
    loadRegistry: function(){
      // W trybie Supabase zwracamy pusty fallback; dane pojawią się asynchronicznie
      if(remoteEnabled()){
        if(window.currentUserData){
          fetchRegistryFromSupabase().then(function(remote){
            if(!remote) return;
            if(window.registry !== undefined && typeof normalizeRegistry === 'function'){
              window.registry = remote;
              normalizeRegistry();
              if(typeof renderEw === 'function') renderEw();
              if(typeof updateBadge === 'function') updateBadge();
            }
          });
        }
        return [];
      }
      // W trybie lokalnym czytaj z localStorage
      return readJson(keys.registry, []);
    },

    saveRegistry: function(data){
      var ok = remoteEnabled() ? true : writeJson(keys.registry, data || []);
      // Wypchnij do Supabase async — nie blokuje UI
      if(remoteEnabled()) pushRegistryToSupabase(data || []);
      return ok;
    },

    // ── Admin data ──
    loadAdmin: function(fallback){
      // W trybie Supabase zwracamy fallback; dane pobieramy asynchronicznie z bazy
      if(remoteEnabled()){
        if(window.currentUserData){
          fetchAdminFromSupabase().then(function(remote){
            if(!remote) return;
            // W trybie zdalnym dane z Supabase całkowicie zastępują lokalne
            if(window.adminData !== undefined){
              Object.assign(window.adminData, remote);
              if(typeof normalizeAdminData === 'function') normalizeAdminData();
            }
          });
        }
        return fallback || null;
      }
      // W trybie lokalnym czytaj z localStorage
      return readJson(keys.admin, fallback || null);
    },

    saveAdmin: function(data){
      if(remoteEnabled()){
        pushAdminToSupabase(data || {});
        return true;
      }
      return writeJson(keys.admin, data || {});
    },

    // ── Drafty — tylko localStorage (robocze, nie wymagają sync) ──
    loadDrafts: function(){
      return readJson(keys.drafts, {});
    },

    saveDrafts: function(data){
      return writeJson(keys.drafts, data || {});
    },

    getValue: getValue,
    setValue: setValue,

    getTheme: function(){
      return getValue(keys.theme, 'light') || 'light';
    },

    setTheme: function(value){
      return setValue(keys.theme, value || 'light');
    },

    getGoal: function(){
      var value = getValue(keys.goal, '');
      return value && !isNaN(value) ? parseInt(value, 10) : null;
    },

    setGoal: function(value){
      return setValue(keys.goal, String(value));
    },

    getSavedAssessor: function(){
      return getValue(keys.savedAssessor, '') || '';
    },

    setSavedAssessor: function(value){
      return setValue(keys.savedAssessor, value || '');
    },

    getSidebarCollapsed: function(){
      return getValue(keys.sidebarCollapsed, '0') === '1';
    },

    setSidebarCollapsed: function(collapsed){
      return setValue(keys.sidebarCollapsed, collapsed ? '1' : '0');
    },

    // ── Eksponowane helpery Supabase (dla auth-module i admin) ──
    sb: function(){ return window._sb || null; },
    fetchRegistry: fetchRegistryFromSupabase,
    pushRegistry:  pushRegistryToSupabase,
    deleteRegistryEntry: deleteRegistryEntryFromSupabase,
    fetchAdmin:    fetchAdminFromSupabase,
    pushAdmin:     pushAdminToSupabase,
    fetchProfiles: fetchProfilesFromSupabase,
    createProfile: createProfileInSupabase,
    updateProfile: updateProfileInSupabase,
    localMigrationStatus: localMigrationStatus,
    migrateLocalToSupabase: migrateLocalToSupabase,
    clearLocalProductionData: clearLocalProductionData
  };
})();
