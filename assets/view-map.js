export function createMapViews(context) {
  const {
    ico,
    floors,
    childIdsOfTable,
    allTables,
    logicalTableCount,
    bookingDisplayStatus,
    bookingIsOverdue,
    state,
    esc,
    bookingTimeLabel,
    walkInDisplayName,
    walkInDisplayCount,
    pageHead,
    newButton,
    walkInButton,
    activeSessionControlsMarkup
  } = context;
    function tableSelectionState(tableId,date=state.date){
      const hasBooking=state.bookings.some(booking=>booking.date===date&&booking.tableIds.includes(tableId)&&!['cancelled','completed','no-show'].includes(booking.status));
      const hasWalkIn=state.walkIns.some(walkIn=>walkIn.date===date&&walkIn.status==='arrived'&&walkIn.tableIds.includes(tableId));
      if(hasBooking&&hasWalkIn)return 'both';
      if(hasBooking)return 'booking';
      if(hasWalkIn)return 'walk-in';
      return 'empty';
    }

    function tablePickLabel(tableId, pickedSet, kind='booking',date=state.date){const status=tableSelectionState(tableId,date);const stateText=status==='booking'?'ĐẶT':status==='walk-in'?'LẺ':status==='both'?'CÓ':'';const prefix=pickedSet?.has(tableId)?'selected':'plain';return `<button type="button" class="table-pick ${prefix==='selected'?'selected':''} ${status==='empty'?'free':'occupied'}" data-${kind}-table="${tableId}" data-table-state="${status}"><span>${tableId}</span>${stateText?`<small class="table-pick-badge">${stateText}</small>`:''}</button>`;}

    function showTablePickerStatus(button, tableId,date=state.date){
      const status=tableSelectionState(tableId,date);
      const selected=button.classList.contains('selected');
      const labelMap={empty:'',booking:'ĐẶT', 'walk-in':'LẺ', both:'CÓ'};
      const label=document.createElement('span');
      label.textContent=tableId;
      button.replaceChildren(label);
      button.classList.toggle('occupied',status!=='empty');
      button.classList.toggle('free',status==='empty');
      button.classList.toggle('selected',selected);
      const badgeValue=labelMap[status];
      if(badgeValue){
        const badge=document.createElement('small');
        badge.className='table-pick-badge';
        badge.textContent=badgeValue;
        button.append(badge);
      }
      button.dataset.tableState=status;
    }

    function visibleFloorTableIds(floor){
      const allIds=floor.tables.flatMap(tableId=>childIdsOfTable(tableId));
      return allIds.filter(tableId=>{
        const group=state.groups.find(ids=>ids.includes(tableId));
        if(!group)return true;
        const rep=[...group].sort()[0];
        return tableId===rep;
      });
    }

    function tableCard(tableId){
      const group=state.groups.find(tableGroup=>tableGroup.includes(tableId)),memberIds=group||[tableId];
      const bookings=state.bookings.filter(booking=>booking.date===state.date&&memberIds.some(memberId=>booking.tableIds.includes(memberId))&&!['cancelled','completed','no-show'].includes(booking.status)).sort((a,b)=>a.time.localeCompare(b.time));
      const walkIns=state.walkIns.filter(walkIn=>walkIn.date===state.date&&walkIn.status==='arrived'&&memberIds.some(memberId=>walkIn.tableIds.includes(memberId)));
      const hasOverdue=bookings.some(booking=>bookingIsOverdue(booking));
      let className='';if(hasOverdue)className='has-overdue';else if(bookings.some(booking=>booking.status==='arrived')||walkIns.length)className='has-arrived';else if(bookings.length)className='has-booking';
      const bookingSlots=bookings.slice(0,2).map(booking=>`<div draggable="true" class="slot ${bookingDisplayStatus(booking)} ${bookingIsOverdue(booking)?'overdue':''}" data-booking="${booking.id}" title="${esc(booking.name)} · ${esc(bookingTimeLabel(booking))} · ${esc(booking.guests)} khách">${esc(bookingTimeLabel(booking))} · ${esc(booking.guests)} khách · ${esc(booking.name.split(' ').slice(-2).join(' '))}</div>`).join('');
      const walkInSlots=walkIns.slice(0,2).map(walkIn=>`<div draggable="true" class="slot arrived walk-in-slot" data-walk-in="${walkIn.id}" title="${esc(walkInDisplayName(walkIn))} · ${esc(walkInDisplayCount(walkIn))}">${esc(walkInDisplayName(walkIn))} · ${esc(walkInDisplayCount(walkIn))}</div>`).join('');
      const moreSlots=bookings.length>2?`<span class="slot-more">+${bookings.length-2} lượt đặt khác</span>`:'';
      const emptyMessage=!bookings.length&&!walkIns.length?'<div class="table-empty">Chưa có lịch đặt</div>':'';
      const zone=allTables.find(table=>table.id===tableId)?.zone||'Khu vực chung';
      return `<article class="table-card ${className} ${group?'merged':''}" data-table="${tableId}" ${state.mergeMode?'data-merge-select="true"':''} tabindex="0"><div class="table-top"><span class="table-id">${tableId}</span><div class="table-top-right"><span class="zone">${zone}</span><button type="button" class="table-add" data-add-booking="${tableId}" title="Thêm booking bàn ${tableId}" aria-label="Thêm booking bàn ${tableId}">${ico('plus')}</button></div></div>${group?`<span class="merged-mark">GHÉP ${group.length} BÀN</span>`:''}<div class="slot-list">${bookingSlots}${walkInSlots}${moreSlots}${emptyMessage}</div></article>`;
    }

    function mapPage(){const floor=floors.find(f=>f.id===state.floor);const floorDisplayTables=visibleFloorTableIds(floor);const areas=[...new Set(floorDisplayTables.map(id=>floor.zones[id]||'Khu vực chung'))].map(name=>({name,tables:floorDisplayTables.filter(id=>(floor.zones[id]||'Khu vực chung')===name)}));const areaClass=name=>name==='View sông'?'river':name.includes('góc')?'corner':name==='Bên trong'?'inside':'common';const filterState=state.mergeMode?`<span class="note">Chọn ít nhất 2 bàn rồi xác nhận ghép.</span><button class="btn small" data-action="confirm-merge">${ico('merge')} Xác nhận ghép (${state.selectedTables.length})</button><button class="btn small" data-action="cancel-merge">Hủy</button>`:`<button class="btn" data-action="merge-mode">${ico('merge')} Ghép bàn</button><button class="btn" data-action="split-group">Tách bàn</button>`;return `${pageHead('Sơ đồ vận hành','Sơ đồ bàn',`${logicalTableCount()} bàn · chạm bàn để xem các lượt đặt trong ngày`,`${newButton()}${walkInButton()}`)}${activeSessionControlsMarkup()}<div class="map-toolbar"><div class="floor-tabs">${floors.map(f=>`<button class="floor-tab ${state.floor===f.id?'active':''}" data-floor="${f.id}">${f.name}<span style="opacity:.75;margin-left:5px">${logicalTableCount(f)}</span></button>`).join('')}</div><div class="spacer"></div>${filterState}<div class="map-legend"><span class="legend-item"><i class="legend-dot"></i>Trống lịch</span><span class="legend-item"><i class="legend-dot booked"></i>Đã đặt</span><span class="legend-item"><i class="legend-dot arrived"></i>Đã đến</span></div></div><section class="floor-section"><div class="floor-section-head"><strong>${floor.name}</strong><span>${floorDisplayTables.length} bàn · kéo booking sang bàn để chuyển</span></div>${areas.map(area=>`<section class="zone-group ${areaClass(area.name)}"><div class="zone-group-head"><i class="zone-marker"></i><strong class="zone-group-title">${area.name}</strong><span class="zone-group-count">${area.tables.length} bàn</span></div><div class="table-grid">${area.tables.map(tableCard).join('')}</div></section>`).join('')}</section><p class="note">Mỗi bàn có thể nhận nhiều booking ở các khung giờ khác nhau. Thời gian sử dụng chỉ bắt đầu tính sau khi check-in và không ấn định trước thời lượng.</p>`}
  return {
    tableSelectionState,
    tablePickLabel,
    showTablePickerStatus,
    visibleFloorTableIds,
    tableCard,
    mapPage
  };
}
