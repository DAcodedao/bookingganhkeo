export function createHistoryActions(context) {
  const {
    floors,
    vipTableIds,
    bookingDisplayStatus,
    state,
    dateInRange,
    esc,
    money,
    dateLabel,
    statusTag,
    displayTables,
    modal,
    openBookingDetail
  } = context;
    function customerHistory(phone,venue='gk2'){const vipTableIds=new Set(floors.find(floor=>floor.id==='vip')?.tables||[]);const rows=state.bookings.filter(b=>b.phone===phone&&dateInRange(b.date)&&b.tableIds.some(tableId=>vipTableIds.has(tableId))===(venue==='vip3')).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));const c=rows[0];modal(`Lịch sử · ${esc(c?.name||'Khách hàng')}`,`${esc(phone)} · ${rows.length} lượt ${venue==='vip3'?'VIP':'đặt bàn'} trong khoảng ngày`,rows.map(b=>`<div class="booking-row" data-booking="${b.id}"><div class="time-mark">${b.time}</div><div class="booking-info"><strong>${dateLabel(b.date,{day:'numeric',month:'short',year:'numeric'})} · ${displayTables(b)}</strong><small>${b.guests} khách · cọc ${money(b.deposit)}</small></div>${statusTag(bookingDisplayStatus(b))}</div>`).join('')||'<div class="empty-state">Chưa có lịch sử khách trong khoảng ngày này.</div>','<button class="btn" data-action="close-modal">Đóng</button>',true);document.querySelectorAll('[data-booking]').forEach(x=>x.addEventListener('click',()=>openBookingDetail(x.dataset.booking)))}
  return {
    customerHistory
  };
}
