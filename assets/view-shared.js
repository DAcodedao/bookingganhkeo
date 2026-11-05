export function createSharedViews(context) {
  const {
    icon,
    ico,
    floors,
    state,
    esc,
    dateLabel,
    walkInDisplayName,
    dayBookings
  } = context;
    const navItems=[['overview','Tổng quan','grid'],['map','Sơ đồ bàn','map'],['bookings','Booking','book'],['customers','Khách hàng','users'],['deposits','Tiền cọc','wallet'],['reports','Báo cáo','chart'],['history','Lịch sử','history'],['settings','Cài đặt','settings']];

    function navButton(item){return `<button class="nav-btn ${state.page===item[0]?'active':''}" data-page="${item[0]}">${ico(item[2])}<span>${item[1]}</span>${item[0]==='bookings'&&dayBookings().length?`<span class="nav-count">${dayBookings().length}</span>`:''}</button>`}

    function shell(){return `<aside class="sidebar"><div class="brand"><img src="http://www.ganhkeone.com/thumbnail/192x192x1/upload/photo/thiet-ke-chua-co-ten-31-2291.png" alt="Logo Gánh Kèo" onerror="this.style.display='none'"><div><div class="brand-name">Nhà Hàng<br>Gánh Kèo</div><div class="brand-sub">Đặt bàn & vận hành</div></div></div><div class="nav-label">Không gian làm việc</div><nav class="nav">${navItems.map(navButton).join('')}</nav><div class="side-bottom"><div class="staff"><div class="avatar">${state.role==='Quản lý'?'QL':'NV'}</div><div><strong>${state.role}</strong><small>Đang hoạt động</small></div><span class="role-tag">ONLINE</span></div></div></aside><main class="main"><header class="topbar"><div class="crumb">Gánh Kèo <span style="color:var(--line);padding:0 7px">/</span> <strong>${navItems.find(i=>i[0]===state.page)?.[1]||'Tổng quan'}</strong></div><div class="top-actions"><span class="demo-chip">Lưu tự động trên thiết bị</span><div class="top-range" style="display:flex;align-items:center;gap:6px;background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:4px 7px;"><input class="top-date" type="date" aria-label="Từ ngày" value="${state.dateFrom}" data-date-from><span style="color:var(--muted);font-size:11px;">→</span><input class="top-date" type="date" aria-label="Đến ngày" value="${state.dateTo}" data-date-to></div><button class="icon-btn" data-action="theme" title="Đổi giao diện" aria-label="Đổi giao diện">${ico(state.theme==='dark'?'sun':'moon')}</button><button class="icon-btn" data-action="alerts" title="Cảnh báo" aria-label="Cảnh báo">${ico('bell')}</button></div></header><section class="content" id="content"></section></main><nav class="mobile-nav">${[['overview','Tổng quan','grid'],['map','Sơ đồ bàn','map'],['bookings','Booking','book'],['customers','Khách hàng','users'],['reports','Báo cáo','chart']].map(navButton).join('')}</nav><div id="modal-root"></div><div id="toast-root"></div>`}

    function pageHead(eyebrow,title,sub,actions=''){const isOverview=state.page==='overview';const heading=isOverview?`${new Intl.DateTimeFormat('vi-VN',{weekday:'long'}).format(new Date(state.date+'T12:00:00'))} · ${dateLabel(state.date,{day:'numeric',month:'long',year:'numeric'})}`:eyebrow;const dateControl=isOverview?`<div class="overview-date-control" aria-label="Chọn ngày tổng quan"><button type="button" class="icon-btn previous" data-overview-day="-1" title="Ngày trước" aria-label="Xem ngày trước">${ico('chevron')}</button><input class="overview-date-input" type="date" value="${state.date}" data-overview-date aria-label="Chọn ngày xem tổng quan"><button type="button" class="icon-btn" data-overview-day="1" title="Ngày tiếp theo" aria-label="Xem ngày tiếp theo">${ico('chevron')}</button></div>`:'';return `<div class="page-head"><div><div class="eyebrow">${heading}</div><h1 class="page-title">${title}</h1><div class="page-sub">${sub}</div>${dateControl}</div><div class="head-actions">${actions}</div></div>`}

    const newButton=(label='Tạo booking mới')=>`<button class="btn primary" data-action="new-booking">${ico('plus')}${label}</button>`;

    const walkInButton=(label='Ghi nhận khách lẻ')=>`<button class="btn secondary-label" data-action="new-walk-in-global">${ico('users')}${label}</button>`;

    function statsMarkup(items){return `<div class="stats">${items.map(x=>`<div class="stat"><div class="stat-top"><span>${x.label}</span><span class="stat-icon">${ico(x.icon)}</span></div><div class="stat-value">${x.value}</div><div class="stat-foot">${x.note||''}</div></div>`).join('')}</div>`}

    function activeSessions(){
      const getFloorId=tableIds=>floors.find(floor=>tableIds.some(tableId=>floor.tables.includes(tableId)))?.id||'other';
      const bookings=state.bookings.filter(booking=>booking.date===state.date&&booking.status==='arrived').map(booking=>({key:`booking:${booking.id}`,kind:'booking',id:booking.id,name:booking.name,tableIds:booking.tableIds,tables:booking.tableIds.join(' + '),floorId:getFloorId(booking.tableIds),time:booking.time,guests:booking.guests}));
      const walkIns=state.walkIns.filter(walkIn=>walkIn.date===state.date&&walkIn.status==='arrived').map(walkIn=>({key:`walk-in:${walkIn.id}`,kind:'walk-in',id:walkIn.id,name:walkInDisplayName(walkIn),tableIds:walkIn.tableIds,tables:walkIn.tableIds.join(' + '),floorId:getFloorId(walkIn.tableIds),time:walkIn.time,guests:walkIn.guests}));
      return [...bookings,...walkIns].sort((a,b)=>a.time.localeCompare(b.time));
    }

    function activeSessionControlsMarkup(actionsOnly=false){
      const sessions=activeSessions(),activeKeys=new Set(sessions.map(session=>session.key));
      state.selectedActiveSessions=state.selectedActiveSessions.filter(key=>activeKeys.has(key));
      const selected=new Set(state.selectedActiveSessions),allSelected=sessions.length>0&&selected.size===sessions.length;
      const rowMarkup=session=>`<label class="active-session-row"><input type="checkbox" data-active-session="${esc(session.key)}" ${selected.has(session.key)?'checked':''}><span class="active-session-info"><strong>${esc(session.name)}</strong><small>${session.kind==='booking'?'Booking đã check-in · ':''}${esc(session.time)} · ${esc(session.guests)} khách</small></span><span class="table-tag">${esc(session.tables)}</span></label>`;
      const rows=actionsOnly?'':floors.map(floor=>{const floorSessions=sessions.filter(session=>session.floorId===floor.id);return floorSessions.length?`<section class="active-session-floor"><div class="active-session-floor-head"><strong>${esc(floor.name)}</strong><span>${floorSessions.length} lượt đang sử dụng</span></div><div class="active-session-floor-rows">${floorSessions.map(rowMarkup).join('')}</div></section>`:''}).join('');
      const otherSessions=sessions.filter(session=>session.floorId==='other');
      const otherRows=otherSessions.length?`<section class="active-session-floor"><div class="active-session-floor-head"><strong>Khu vực khác</strong><span>${otherSessions.length} lượt đang sử dụng</span></div><div class="active-session-floor-rows">${otherSessions.map(rowMarkup).join('')}</div></section>`:'';
      const actions=`<div class="active-session-actions"><button type="button" class="btn small" data-action="toggle-active-session-selection" ${sessions.length?'':'disabled'}>${allSelected?'Bỏ chọn tất cả':'Chọn tất cả'}</button><button type="button" class="btn soft small" data-action="complete-active-sessions" ${selected.size?'':'disabled'}>${ico('check')} Hoàn tất đã chọn</button><button type="button" class="btn danger small" data-action="cancel-active-sessions" ${selected.size?'':'disabled'}>${ico('close')} Hủy đã chọn</button></div>`;
      if(actionsOnly)return `<div class="active-session-toolbar"><span class="panel-note">${sessions.length} lượt đang sử dụng · ${selected.size} lượt đã chọn</span>${actions}</div>`;
      return `<details class="panel active-session-panel" ${state.activeSessionsOpen?'open':''}><summary class="active-session-head"><span class="panel-title">Đang sử dụng bàn/phòng</span><span class="active-session-count">${sessions.length} lượt đang sử dụng</span><span class="active-session-chevron">${ico('chevron')}</span></summary><div class="active-session-content"><div class="active-session-toolbar"><span class="panel-note">${sessions.length} lượt đang sử dụng · ${selected.size} lượt đã chọn</span>${actions}</div><div class="active-session-list">${rows}${otherRows||''}${sessions.length?'':'<div class="empty-state">Hiện không có bàn/phòng nào đang sử dụng.</div>'}</div></div></details>`;
    }
  return {
    navItems,
    navButton,
    shell,
    pageHead,
    newButton,
    walkInButton,
    statsMarkup,
    activeSessions,
    activeSessionControlsMarkup
  };
}
