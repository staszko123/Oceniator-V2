export function initStartDashboard(){

  function getData(){
    return (window.registry ? window.registry.filter(e => !e.archived) : []) || [];
  }

  function render(){
    const data=getData();
    const today=new Date().toISOString().slice(0,10);

    const todayList=data.filter(x=>x.data===today);
    const avg=todayList.length
      ? Math.round(todayList.reduce((a,b)=>a+(b.avgFinal||0),0)/todayList.length)
      : 0;

    const last=data.slice(-5).reverse();

    // Update quick stats
    const statToday = document.getElementById('stat-today');
    const statAvg = document.getElementById('stat-avg');
    const statTotal = document.getElementById('stat-total');

    if(statToday) statToday.textContent = todayList.length;
    if(statAvg) statAvg.textContent = `${avg}%`;
    if(statTotal) statTotal.textContent = data.length;

    // Update recent activity
    const activityList = document.getElementById('activity-list');
    if(activityList){
      if(last.length > 0){
        activityList.innerHTML = last.map(entry => `
          <div class="activity-item">
            <div class="activity-icon">${getActivityIcon(entry.type)}</div>
            <div class="activity-content">
              <div class="activity-title">${entry.spec || 'Nieznany specjalista'}</div>
              <div class="activity-meta">${formatDate(entry.data)} • ${entry.avgFinal || 0}%</div>
            </div>
          </div>
        `).join('');
      } else {
        activityList.innerHTML = `
          <div class="activity-empty">
            <div class="activity-empty-icon">${activitySvg('clipboard')}</div>
            <div class="activity-empty-text">Brak ostatnich ocen</div>
            <div class="activity-empty-subtext">Rozpocznij pracę, aby zobaczyć historię</div>
          </div>
        `;
      }
    }
  }

  function getActivityIcon(type){
    switch(type){
      case 'rozmowy': return activitySvg('phone');
      case 'maile': return activitySvg('mail');
      case 'systemy': return activitySvg('monitor');
      default: return activitySvg('clipboard');
    }
  }

  function activitySvg(name){
    const paths={
      phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.3 19.3 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9Z"/>',
      mail:'<path d="M4 5h16v14H4z"/><path d="m4 7 8 6 8-6"/>',
      monitor:'<path d="M4 5h16v11H4z"/><path d="M9 21h6M12 16v5"/>',
      clipboard:'<path d="M9 4h6l1 2h3v15H5V6h3Z"/><path d="M9 4a3 3 0 0 1 6 0"/><path d="M9 11h6M9 15h4"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[name]||paths.clipboard)+'</svg>';
  }

  function formatDate(dateStr){
    if(!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // HARD FIX: render cykliczny (pewność działania w SPA)
  setInterval(render,1000);

  // pierwszy render
  setTimeout(render,300);
}
