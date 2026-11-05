export function createBookingsViews(context) {
  const {
    icon,
    ico,
    recordBelongsToVenue,
    statusNames,
    bookingDisplayStatus,
    state,
    dateInRange,
    dateRangeText,
    esc,
    money,
    dateLabel,
    bookingTimeLabel,
    statusTag,
    displayTables,
    pageHead,
    newButton,
    walkInButton,
    statsMarkup
  } = context;
    function bookingTable(){
      let rows=state.bookings.filter(booking=>dateInRange(booking.date));
      if(state.statusFilter!=='all')rows=rows.filter(booking=>booking.status===state.statusFilter);
      if(state.search){
        const query=state.search.toLocaleLowerCase('vi');
        rows=rows.filter(booking=>`${booking.name} ${booking.phone} ${booking.tableIds.join(' ')}`.toLocaleLowerCase('vi').includes(query));
      }
      rows.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
      const renderVenue=(venue,label)=>{
        const venueRows=rows.filter(booking=>recordBelongsToVenue(booking,venue));
        const tableRows=venueRows.map(booking=>`<tr data-booking="${booking.id}"><td><strong>${dateLabel(booking.date,{day:'2-digit',month:'2-digit',year:'numeric'})}</strong></td><td>${esc(bookingTimeLabel(booking))}</td><td>${esc(booking.name)}</td><td>${esc(booking.phone)}</td><td>${booking.guests}</td><td>${displayTables(booking)}</td><td>${money(booking.deposit)}</td><td>${statusTag(bookingDisplayStatus(booking))}</td></tr>`).join('');
        return `<details class="customer-group panel venue-section" data-booking-venue="${venue}" ${state.bookingVenueOpen[venue]?'open':''}><summary><span class="customer-group-label">${label}</span><span class="customer-group-count">${venueRows.length} lượt đặt</span></summary><div class="customer-venue-content"><div class="table-wrap"><table class="data-table"><thead><tr><th>Ngày</th><th>Giờ</th><th>Khách</th><th>Liên hệ</th><th>Số khách</th><th>Bàn</th><th>Tiền cọc</th><th>Trạng thái</th></tr></thead><tbody>${tableRows}</tbody></table>${venueRows.length?'':`<div class="empty-state">${ico('book')}Không có booking phù hợp trong khoảng ngày đã chọn.</div>`}</div></div></details>`;
      };
      return `${pageHead('Lịch đặt','Booking',`${dateRangeText()} · ${rows.length} lượt đặt`,`${newButton()}${walkInButton()}`)}<div class="panel"><div class="panel-head"><div class="filters"><label class="toolbar-search">${ico('search')}<input data-search placeholder="Tên khách, số điện thoại, bàn/phòng" value="${esc(state.search)}"></label><select class="filter-select" data-status-filter><option value="all">Tất cả trạng thái</option>${Object.entries(statusNames).map(([key,value])=>`<option value="${key}" ${state.statusFilter===key?'selected':''}>${value}</option>`).join('')}</select></div><button class="btn small" data-action="export">${ico('download')} Xuất CSV</button></div><div class="panel-body venue-sections">${renderVenue('gk2','Gánh Kèo 2')}${renderVenue('vip3','Gánh Kèo VIP')}</div></div>`;
    }

    function depositsPage(){const rows=state.bookings.filter(b=>b.date===state.date&&+b.deposit>0).sort((a,b)=>a.time.localeCompare(b.time));const sum=rows.reduce((n,b)=>n+(+b.deposit||0),0);return `${pageHead('Đối soát','Tiền cọc',`${dateLabel(state.date)} · ${rows.length} khoản cọc`,`${newButton()}${walkInButton()}`)}${statsMarkup([{label:'Tổng tiền cọc',value:money(sum),icon:'wallet',note:'Theo ngày đang chọn'},{label:'Đã nhận cọc',value:rows.length,icon:'check',note:'Booking có ghi nhận tiền cọc'},{label:'Chưa đặt cọc',value:state.bookings.filter(b=>b.date===state.date&&b.status==='confirmed'&&!b.deposit).length,icon:'clock',note:'Cần theo dõi xác nhận'}])}<section class="panel"><div class="panel-head"><div class="panel-title">Chi tiết tiền cọc</div><span class="note">Cọc được ghi nhận trong từng booking</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Giờ</th><th>Khách</th><th>Số điện thoại</th><th>Bàn</th><th>Tiền cọc</th><th>Trạng thái</th></tr></thead><tbody>${rows.map(b=>`<tr data-booking="${b.id}"><td>${b.time}</td><td>${esc(b.name)}</td><td>${esc(b.phone)}</td><td>${displayTables(b)}</td><td><strong>${money(b.deposit)}</strong></td><td>${statusTag(bookingDisplayStatus(b))}</td></tr>`).join('')}</tbody></table>${rows.length?'':'<div class="empty-state">Ngày này chưa ghi nhận tiền cọc.</div>'}</div></section>`}
  return {
    bookingTable,
    depositsPage
  };
}
