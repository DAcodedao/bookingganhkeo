export function createTablesActions(context) {
  const {
    ico,
    allTables,
    bookingDisplayStatus,
    state,
    save,
    esc,
    money,
    dateLabel,
    statusTag,
    displayTables,
    walkInDisplayName,
    walkInDisplayCount,
    render,
    audit,
    toast,
    closeModal,
    modal,
    openBooking,
    openTableChange,
    checkIn,
    openBookingDetail,
    openWalkIn,
    cancelWalkIn,
    completeWalkIn,
    openWalkInDetail
  } = context;
    function openTable(tableId){
      const group=state.groups.find(tableGroup=>tableGroup.includes(tableId)),memberIds=group||[tableId],meta=allTables.find(table=>table.id===tableId)||{id:tableId,floor:state.floor,zone:'Khu vực chung'};
      const bookings=state.bookings.filter(booking=>booking.date===state.date&&memberIds.some(memberId=>booking.tableIds.includes(memberId))&&!['cancelled','completed','no-show'].includes(booking.status)).sort((a,b)=>a.time.localeCompare(b.time));
      const walkIns=state.walkIns.filter(walkIn=>walkIn.date===state.date&&memberIds.some(memberId=>walkIn.tableIds.includes(memberId)));
      const bookingRows=bookings.map(booking=>{const lastName=booking.name.trim().split(/\s+/).pop()||'khách',displayName=lastName.charAt(0).toLocaleUpperCase('vi-VN')+lastName.slice(1),checkInAction=booking.status!=='arrived'&&booking.status!=='completed'?`<button class="btn soft small" data-checkin="${booking.id}" aria-label="Check-in cho ${esc(booking.name)}">${ico('check')} Check-in ${esc(displayName)}</button>`:'';return `<div class="booking-row table-visit-row" data-booking="${booking.id}"><div class="time-mark">${booking.time}</div><div class="booking-info"><strong>${esc(booking.name)}</strong><small>${booking.guests} khách · ${esc(booking.phone)}</small><small>Bàn ${displayTables(booking)} · Cọc ${money(booking.deposit)}</small></div>${statusTag(bookingDisplayStatus(booking))}<div class="booking-actions">${checkInAction}<button class="btn small" data-select-booking="${booking.id}">Chọn khách</button><button class="btn small" data-table-change-kind="booking" data-table-change-id="${booking.id}">${ico('edit')} Đổi bàn</button></div></div>`}).join('');
      const walkInRows=walkIns.map(walkIn=>{const active=walkIn.status==='arrived',cancelled=walkIn.status==='cancelled',time=walkIn.time||(walkIn.checkIn?new Date(walkIn.checkIn).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'--:--'),status=active?'<span class="status arrived">Đang sử dụng</span>':cancelled?'<span class="status cancelled">Đã hủy</span>':'<span class="status completed">Đã hoàn tất</span>',activeActions=active?`<button class="btn soft small" data-complete-walk-in="${walkIn.id}">${ico('check')} Hoàn tất</button><button class="btn danger small" data-cancel-walk-in="${walkIn.id}">${ico('close')} Hủy</button>`:'';return `<div class="table-visit-row walk-in-entry" data-walk-in="${walkIn.id}"><div class="time-mark">${esc(time)}</div><div class="booking-info"><strong>${esc(walkInDisplayName(walkIn))}</strong><small>${esc(walkInDisplayCount(walkIn))}</small><small>Bàn ${walkIn.tableIds.map(esc).join(' + ')}</small>${active?`<small>Đã ngồi: <span class="elapsed" data-elapsed="${esc(walkIn.checkIn||new Date().toISOString())}"></span></small>`:''}</div>${status}<div class="booking-actions">${activeActions}<button class="btn small" data-edit-walk-in="${walkIn.id}">${ico('edit')} Chỉnh sửa</button></div></div>`}).join('');
      const list=bookingRows+walkInRows||'<div class="empty-state">Bàn chưa có booking hoặc khách lẻ trong ngày này.</div>';
      const split=group&&state.canManageData?`<button class="btn small" data-action="split-this" data-table-id="${tableId}">${ico('merge')} Tách nhóm bàn</button>`:'';
      const extraActions=split?`<div class="detail-actions" style="margin-top:13px">${split}</div>`:'';
      modal(`${tableId} · ${meta.zone}`,`${meta.floor} · ${dateLabel(state.date)} · ${bookings.length} booking · ${walkIns.length} khách lẻ`,`${list}${extraActions}`,`<button class="btn" data-action="close-modal">Đóng</button><span class="spacer"></span><button class="btn" data-action="new-walk-in" data-table-id="${tableId}">${ico('users')} Ghi nhận khách lẻ</button><button class="btn primary" data-action="new-at-table" data-table-id="${tableId}">${ico('plus')} Thêm booking</button>`,true);
      document.querySelectorAll('.modal .booking-row[data-booking]').forEach(row=>row.addEventListener('click',()=>openBookingDetail(row.dataset.booking)));
      document.querySelectorAll('.modal .walk-in-entry[data-walk-in]').forEach(row=>row.addEventListener('click',event=>{if(!event.target.closest('button'))openWalkInDetail(row.dataset.walkIn)}));
      document.querySelectorAll('[data-checkin]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();checkIn(button.dataset.checkin)}));
      document.querySelectorAll('[data-complete-walk-in]').forEach(button=>button.addEventListener('click',()=>completeWalkIn(button.dataset.completeWalkIn)));
      document.querySelectorAll('[data-cancel-walk-in]').forEach(button=>button.addEventListener('click',()=>cancelWalkIn(button.dataset.cancelWalkIn)));
      document.querySelectorAll('[data-edit-walk-in]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();openWalkIn(walkIns.find(w=>w.id===button.dataset.editWalkIn)?.tableIds || [], button.dataset.editWalkIn);}));
      document.querySelectorAll('[data-table-change-kind]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();openTableChange(button.dataset.tableChangeKind,button.dataset.tableChangeId)}));
      document.querySelector('[data-action="new-at-table"]').addEventListener('click',()=>openBooking(null,[tableId]));
      document.querySelector('[data-action="new-walk-in"]').addEventListener('click',()=>openWalkIn([tableId]));
      document.querySelector('[data-action="split-this"]')?.addEventListener('click',()=>splitGroup(tableId));
    }

    function splitGroup(table){if(!state.canManageData)return;const group=state.groups.find(g=>g.includes(table));if(!group)return;state.groups=state.groups.filter(g=>g!==group);audit('Tách bàn',group.join(' + '));save();closeModal();render();toast(`Đã tách ${group.join(' + ')}`)}

    function mergeSelected(){if(!state.canManageData)return;if(state.selectedTables.length<2){toast('Chọn ít nhất hai bàn để ghép');return}const ids=[...new Set(state.selectedTables.flatMap(tableId=>state.groups.find(group=>group.includes(tableId))||[tableId]))];state.groups=state.groups.filter(group=>!group.some(tableId=>ids.includes(tableId)));state.groups.push(ids);audit('Ghép bàn',ids.join(' + '));state.mergeMode=false;state.selectedTables=[];save();render();toast(`Đã ghép ${ids.join(' + ')}`)}

    function moveBooking(id,table){const b=state.bookings.find(x=>x.id===id);if(!b||b.tableIds.includes(table))return;b.tableIds=[table];audit('Chuyển bàn bằng kéo thả',`${b.name} · ${table}`);save();render();toast(`Đã chuyển ${b.name} sang ${table}`)}

    function moveWalkIn(id,table){const walkIn=state.walkIns.find(item=>item.id===id&&item.status==='arrived');if(!walkIn||walkIn.tableIds.includes(table))return;const bookingConflict=state.bookings.some(booking=>booking.date===walkIn.date&&booking.time===walkIn.time&&booking.tableIds.includes(table)&&!['cancelled','completed','no-show'].includes(booking.status));if(bookingConflict){toast(`Bàn ${table} đã có booking lúc ${walkIn.time}`);return}const oldTable=walkIn.tableIds.join(' + ');walkIn.tableIds=[table];audit('Chuyển khách lẻ bằng kéo thả',`${walkIn.customerName||'Khách lẻ'} · ${oldTable} → ${table}`);save();render();toast(`Đã chuyển khách lẻ sang ${table}`)}
  return {
    openTable,
    splitGroup,
    mergeSelected,
    moveBooking,
    moveWalkIn
  };
}
