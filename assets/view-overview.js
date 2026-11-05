export function createOverviewViews(context) {
  const {
    icon,
    ico,
    today,
    floors,
    logicalTableCount,
    bookingDisplayStatus,
    state,
    esc,
    money,
    dateLabel,
    statusTag,
    displayTables,
    walkInDisplayName,
    dayBookings,
    bookingsForTable,
    countTableUsages,
    pageHead,
    newButton,
    walkInButton,
    statsMarkup,
    activeSessions,
    activeSessionControlsMarkup
  } = context;
    function overview(){
      const list=dayBookings();
      const scheduleBookings=state.bookings.filter(booking=>booking.date===state.date&&!['cancelled','completed','no-show'].includes(booking.status)).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
      const scheduleWalkIns=state.walkIns.filter(walkIn=>walkIn.date===state.date&&!['cancelled','completed'].includes(walkIn.status)).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
      const dayBookingsValid=state.bookings.filter(booking=>booking.date===state.date&&!['cancelled','no-show'].includes(booking.status));
      const dayWalkInsValid=state.walkIns.filter(walkIn=>walkIn.date===state.date&&walkIn.status!=='cancelled');
      const usedTableIds=new Set([...dayBookingsValid.flatMap(booking=>booking.tableIds||[]),...dayWalkInsValid.flatMap(walkIn=>walkIn.tableIds||[])]);
      const totalUsedGuests=dayBookingsValid.reduce((total,booking)=>total+(+booking.guests||0),0)+dayWalkInsValid.reduce((total,walkIn)=>total+(+walkIn.guests||0),0);
      const floorsStats=floors.map(f=>({name:f.name,all:f.tables.length,busy:f.tables.filter(t=>bookingsForTable(t).length).length}));
      const actions=`${newButton()}${walkInButton()}<button class="btn secondary-label" data-page="map">${ico('map')} Sơ đồ bàn</button>`;
      const scheduleRows=(records,kind)=>records.map(record=>{
        const isWalkIn=kind==='walk-in';
        const id=esc(record.id);
        const name=esc(isWalkIn?walkInDisplayName(record):record.name);
        const details=isWalkIn?`${esc(record.guests)} khách`:`${esc(record.guests)} khách · ${esc(record.phone)}`;
        const tables=isWalkIn?record.tableIds.map(esc).join(' + '):displayTables(record);
        const status=isWalkIn?record.status:bookingDisplayStatus(record);
        const active=record.status==='arrived';
        const activeKey=`${kind}:${record.id}`;
        const checked=state.selectedActiveSessions.includes(activeKey);
        const marker=active?`<input type="checkbox" class="overview-active-toggle" data-active-session="${esc(activeKey)}" aria-label="Chọn ${name} để hoàn tất hoặc hủy" ${checked?'checked':''}>`:'';
        return `<div class="booking-row overview-booking-row${active?' has-active-session':''}" ${isWalkIn?`data-walk-in="${id}"`:`data-booking="${id}"`}>${marker}<div class="time-mark">${esc(record.time||'—')}<span></span></div><div class="booking-info"><strong>${name}</strong><small>${details}</small></div><span class="table-tag">${tables}</span>${statusTag(status)}</div>`;
      }).join('');
      const schedulePanel=(kind,title,records)=>{
        const activeCount=activeSessions().filter(session=>session.kind===kind).length;
        const empty=kind==='booking'?'Chưa có booking trong ngày này.':'Chưa có khách lẻ trong ngày này.';
        return `<section class="panel overview-schedule-panel"><div class="panel-head"><div><div class="panel-title">${title}</div><div class="panel-note">${records.length} lượt trong ngày · ${activeCount} đang sử dụng</div></div>${kind==='booking'?`<button class="btn small" data-page="bookings">Tất cả booking ${ico('chevron')}</button>`:''}</div><div class="panel-body today-list">${scheduleRows(records,kind)||`<div class="empty-state">${ico(kind==='booking'?'book':'users')}${empty}</div>`}</div></section>`;
      };
      return `${pageHead('Tổng quan','Tổng quan','Xem lịch và chỉ số hoạt động theo ngày',actions)}${statsMarkup(overviewDailyMetrics())}<div class="grid-main"><section class="panel overview-calendar-panel"><div class="panel-head"><div><div class="panel-title">Lịch khách trong ngày</div><div class="panel-note">${dateLabel(state.date)} · chọn checkbox ở khách đang ngồi để thao tác hàng loạt</div></div>${activeSessionControlsMarkup(true)}</div><div class="panel-body"><div class="overview-schedule-grid">${schedulePanel('booking','Booking',scheduleBookings)}${schedulePanel('walk-in','Khách lẻ',scheduleWalkIns)}</div></div></section><div style="display:grid;gap:14px;align-content:start"><section class="panel"><div class="panel-head"><div><div class="panel-title">Tình trạng các tầng</div><div class="panel-note">${logicalTableCount()} bàn · không giới hạn lượt đặt theo ngày</div></div><button class="icon-btn" data-page="map" title="Mở sơ đồ">${ico('arrow')}</button></div><div class="panel-body floor-stack">${floorsStats.map(f=>`<div class="floor-summary"><div><strong>${f.name}</strong><small>${f.busy} bàn có lịch · ${f.all-f.busy} bàn trống lịch</small></div><div class="floor-count">${f.busy}<span style="font:400 11px 'DM Sans',sans-serif;color:var(--muted)">/${f.all}</span></div></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><div><div class="panel-title">Cần theo dõi</div><div class="panel-note">Nhắc việc trong ngày</div></div></div><div class="panel-body">${list.filter(b=>['confirmed'].includes(b.status)).slice(0,3).map(b=>`<div class="alert-line"><span class="alert-dot"></span><div><strong>${esc(b.time)} · ${esc(b.name)}</strong><small>${`Chưa check-in · ${displayTables(b)}`}</small></div></div>`).join('')||'<div class="note">Không có nhắc việc mới.</div>'}</div></section></div></div>`;
    }

    function overviewDailyMetrics(){
      const reserved=state.bookings.filter(booking=>booking.date===state.date&&booking.status!=='cancelled');
      const seated=reserved.filter(booking=>booking.status==='arrived');
      const seatedWalkIns=state.walkIns.filter(walkIn=>walkIn.date===state.date&&walkIn.status==='arrived');
      const waiting=reserved.filter(booking=>['confirmed'].includes(booking.status));
      const validBookings=state.bookings.filter(booking=>booking.date===state.date&&!['cancelled','no-show'].includes(booking.status));
      const validWalkIns=state.walkIns.filter(walkIn=>walkIn.date===state.date&&walkIn.status!=='cancelled');
      const usedTableCount=countTableUsages(validBookings)+countTableUsages(validWalkIns);
      const usedGuests=validBookings.reduce((total,booking)=>total+(+booking.guests||0),0)+validWalkIns.reduce((total,walkIn)=>total+(+walkIn.guests||0),0);
      const countTables=records=>countTableUsages(records);
      const countGuests=bookings=>bookings.reduce((total,booking)=>total+(+booking.guests||0),0);
      const deposits=state.bookings.filter(booking=>booking.date===state.date&&(+booking.deposit||0)>0);
      const occupiedTableCount=countTableUsages(seated)+countTableUsages(seatedWalkIns);
      return[
        {label:'Tổng số bàn/phòng và khách đã sử dụng trong ngày',value:`<div class="stat-split"><div class="stat-main"><div class="total-line"><strong>${usedTableCount}</strong><span>vị trí</span></div><div class="total-line"><strong>${usedGuests}</strong><span>khách</span></div></div><div class="stat-detail"><div class="stat-detail-row"><span>Booking:</span><strong>${validBookings.length}</strong></div><div class="stat-detail-row"><span>${countTables(validBookings)} bàn/phòng · ${countGuests(validBookings)} khách</span></div><div class="stat-detail-row"><span>Khách lẻ:</span><strong>${countTables(validWalkIns)} bàn/phòng · ${validWalkIns.reduce((total,walkIn)=>total+(+walkIn.guests||0),0)} khách</strong></div></div></div>`,icon:'grid',note:`${usedGuests} khách · ${validBookings.length + validWalkIns.length} lượt (booking + khách lẻ)`},
        {label:'Bàn/phòng đang sử dụng',value:occupiedTableCount,icon:'grid',note:`${countGuests(seated)+countGuests(seatedWalkIns)} khách đang ngồi`},
        {label:'Bàn/phòng chờ khách check-in',value:countTables(waiting),icon:'clock',note:`${countGuests(waiting)} khách · ${waiting.length} booking`},
        {label:'Tiền cọc trong ngày',value:money(deposits.reduce((total,booking)=>total+(+booking.deposit||0),0)),icon:'wallet',note:`${deposits.length} booking có cọc`}
      ];
    }
  return {
    overview,
    overviewDailyMetrics
  };
}
