export function createReportsViews(context) {
  const {
    ico,
    recordBelongsToVenue,
    statusNames,
    state,
    esc,
    money,
    dateLabel,
    statusTag,
    countTableUsages,
    pageHead,
    newButton,
    walkInButton
  } = context;
    function reportsPage(){
      const mode=state.reportMode,anchor=state.date.slice(0,4),labels=[],values=[],periodRows=[];
      const summarize=records=>({tables:countTableUsages(records),guests:records.reduce((sum,record)=>sum+(+record.guests||0),0),count:records.length});
      const addPeriod=(label,bookings,walkIns)=>{
        const venues={};
        ['gk2','vip3'].forEach(venue=>{
          venues[venue]={
            booking:summarize(bookings.filter(record=>recordBelongsToVenue(record,venue))),
            walkIn:summarize(walkIns.filter(record=>recordBelongsToVenue(record,venue)))
          };
        });
        periodRows.push({label,bookingTables:countTableUsages(bookings),bookingGuests:bookings.reduce((sum,booking)=>sum+(+booking.guests||0),0),walkInTables:countTableUsages(walkIns),walkInGuests:walkIns.reduce((sum,walkIn)=>sum+(+walkIn.guests||0),0),venues});
      };
      if(mode==='month'){
        for(let i=1;i<=12;i++){
          const month=`${anchor}-${String(i).padStart(2,'0')}`;
          const bookings=state.bookings.filter(booking=>booking.date.startsWith(month)&&!['cancelled','no-show'].includes(booking.status));
          const walkIns=state.walkIns.filter(walkIn=>walkIn.date.startsWith(month)&&walkIn.status!=='cancelled');
          labels.push(`T${i}`);values.push(bookings.length);addPeriod(`Tháng ${i}`,bookings,walkIns);
        }
      }else if(mode==='year'){
        for(let i=anchor-4;i<=+anchor;i++){
          const year=String(i);
          const bookings=state.bookings.filter(booking=>booking.date.startsWith(year)&&!['cancelled','no-show'].includes(booking.status));
          const walkIns=state.walkIns.filter(walkIn=>walkIn.date.startsWith(year)&&walkIn.status!=='cancelled');
          labels.push(String(i));values.push(bookings.length);addPeriod(`Năm ${i}`,bookings,walkIns);
        }
      }else{
        const date=new Date(state.date+'T12:00:00'),first=new Date(date);first.setDate(date.getDate()-6);
        for(let i=0;i<7;i++){
          const day=new Date(first);day.setDate(first.getDate()+i);
          const dayKey=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
          const bookings=state.bookings.filter(booking=>booking.date===dayKey&&!['cancelled','no-show'].includes(booking.status));
          const walkIns=state.walkIns.filter(walkIn=>walkIn.date===dayKey&&walkIn.status!=='cancelled');
          labels.push(new Intl.DateTimeFormat('vi-VN',{weekday:'short'}).format(day));values.push(bookings.length);
          addPeriod(dateLabel(dayKey,{weekday:'short',day:'numeric',month:'short'}),bookings,walkIns);
        }
      }
      const total=values.reduce((sum,value)=>sum+value,0),max=Math.max(...values,1);
      const comparison=mode==='month'?`Tổng booking năm ${anchor}`:mode==='year'?'Tổng booking theo năm':'Booking 7 ngày gần nhất';
      const accepted=state.bookings.filter(booking=>!['cancelled','no-show'].includes(booking.status));
      const countSummary=(locations,guests)=>`${locations} bàn/phòng · ${guests} khách`;
      const summaryTable=mode==='week'?`<div class="table-wrap" style="margin-top:16px"><table class="data-table"><thead><tr><th>Thứ / ngày / tháng</th><th>Booking</th><th>Khách lẻ</th><th>Tổng ngày</th></tr></thead><tbody>${periodRows.map(row=>{const totalTables=row.bookingTables+row.walkInTables,totalGuests=row.bookingGuests+row.walkInGuests;return `<tr><td>${row.label}${row.label===dateLabel(state.date,{weekday:'short',day:'numeric',month:'short'})?' · Hôm nay':''}</td><td>${countSummary(row.bookingTables,row.bookingGuests)}</td><td>${countSummary(row.walkInTables,row.walkInGuests)}</td><td>${countSummary(totalTables,totalGuests)}</td></tr>`;}).join('')}</tbody></table></div>`:`<div class="table-wrap" style="margin-top:16px"><table class="data-table"><thead><tr><th>${mode==='month'?'Tháng':'Năm'}</th><th>Booking</th><th>Khách lẻ</th><th>Tổng</th></tr></thead><tbody>${periodRows.map(row=>{const totalTables=row.bookingTables+row.walkInTables,totalGuests=row.bookingGuests+row.walkInGuests;return `<tr><td>${row.label}</td><td>${countSummary(row.bookingTables,row.bookingGuests)}</td><td>${countSummary(row.walkInTables,row.walkInGuests)}</td><td>${countSummary(totalTables,totalGuests)}</td></tr>`;}).join('')}</tbody></table></div>`;
      const venueReport=(venue,label)=>{
        const totals=periodRows.reduce((summary,row)=>{
          const booking=row.venues[venue].booking,walkIn=row.venues[venue].walkIn;
          summary.booking+=booking.count;summary.walkIn+=walkIn.count;
          return summary;
        },{booking:0,walkIn:0});
        const flowReport=(flow,labelText)=>{
          const rows=periodRows.map(row=>{
            const summary=row.venues[venue][flow];
            return `<tr><td>${row.label}</td><td>${summary.count}</td><td>${summary.tables} bàn/phòng</td><td>${summary.guests} khách</td></tr>`;
          }).join('');
          const count=flow==='booking'?totals.booking:totals.walkIn;
          return `<details class="customer-flow-toggle" data-report-flow="${venue}${flow==='booking'?'Booking':'WalkIn'}" ${state.reportFlowOpen[`${venue}${flow==='booking'?'Booking':'WalkIn'}`]?'open':''}><summary>${labelText}<span class="customer-flow-count">${count} lượt</span></summary><div class="customer-flow-scroll"><div class="table-wrap report-period-table"><table class="data-table"><thead><tr><th>Kỳ</th><th>Lượt</th><th>Bàn/phòng</th><th>Khách</th></tr></thead><tbody>${rows}</tbody></table></div></div></details>`;
        };
        return `<details class="customer-group panel venue-section" data-report-venue="${venue}" ${state.reportVenueOpen[venue]?'open':''}><summary><span class="customer-group-label">${label}</span><span class="customer-group-count">${totals.booking} booking · ${totals.walkIn} khách lẻ</span></summary><div class="customer-venue-content">${flowReport('booking','Khách booking')}${flowReport('walkIn','Khách lẻ')}</div></details>`;
      };
      return `${pageHead('Phân tích hoạt động','Báo cáo','So sánh booking theo ngày, tháng và năm',`${newButton()}${walkInButton()}`)}<div class="filters" style="margin-bottom:14px"><div class="floor-tabs"><button class="floor-tab ${mode==='week'?'active':''}" data-report="week">7 ngày</button><button class="floor-tab ${mode==='month'?'active':''}" data-report="month">Theo tháng</button><button class="floor-tab ${mode==='year'?'active':''}" data-report="year">Theo năm</button></div><label class="note">Năm tham chiếu: <input class="filter-select" type="number" min="2020" max="2100" value="${anchor}" data-report-year style="width:86px"></label></div><div class="report-grid"><section class="panel"><div class="panel-head"><div><div class="panel-title">${comparison}</div><div class="panel-note">Không tính booking đã hủy hoặc khách không đến</div></div></div><div class="panel-body"><div class="report-total">${total}<span style="font:400 12px 'DM Sans',sans-serif;color:var(--muted)"> booking</span></div><div class="bar-chart">${values.map((value,index)=>`<div class="bar-col"><span class="bar-value">${value||''}</span><div class="bar ${index===values.length-1?'current':''}" style="height:${Math.max(value/max*100,value?5:2)}%"></div><span class="bar-label">${labels[index]}</span></div>`).join('')}</div>${summaryTable}</div></section><section class="panel"><div class="panel-head"><div><div class="panel-title">Tổng hợp trạng thái</div><div class="panel-note">${accepted.length} booking hợp lệ toàn thời gian</div></div></div><div class="panel-body">${Object.entries(statusNames).map(([key])=>{const count=state.bookings.filter(booking=>booking.status===key).length;return `<div class="detail-line"><span>${statusTag(key)}</span><strong>${count}</strong></div>`}).join('')}<div class="detail-line"><span>Tiền cọc đã ghi nhận</span><strong>${money(state.bookings.reduce((sum,booking)=>sum+(+booking.deposit||0),0))}</strong></div></div></section></div><section class="report-venue-groups">${venueReport('gk2','Gánh Kèo 2')}${venueReport('vip3','Gánh Kèo VIP')}</section>`;
    }

    const historySubject=subject=>String(subject||'').replace(/\b\d{4}-\d{2}-\d{2}\b/g,date=>dateLabel(date,{day:'2-digit',month:'2-digit',year:'numeric'}));
    const historyDateTime=value=>{const timestamp=new Date(value);return `${new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(timestamp)} ${timestamp.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`};
    function historyPage(){const rows=[...state.history].reverse();return `${pageHead('Nhật ký hệ thống','Lịch sử','Theo dõi chỉnh sửa booking và thao tác bàn',`${newButton()}${walkInButton()}`) }<section class="panel"><div class="panel-head"><div class="panel-title">${rows.length} hoạt động gần đây</div><button type="button" class="btn small" data-action="clear-history">Xóa lịch sử</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Thời gian</th><th>Chức vụ</th><th>Thao tác</th><th>Booking / bàn</th></tr></thead><tbody>${rows.map(h=>`<tr><td>${historyDateTime(h.at)}</td><td>${esc(h.by)}</td><td>${esc(h.action)}</td><td>${esc(historySubject(h.subject))}</td></tr>`).join('')}</tbody></table>${rows.length?'':'<div class="empty-state">Thao tác chỉnh sửa sẽ được lưu tại đây.</div>'}</div></section>`}

    function settingsPage(){return `${pageHead('Thiết lập nhà hàng','Cài đặt','Tuỳ chỉnh giao diện, phân quyền và dữ liệu',`${newButton()}${walkInButton()}`) }<div class="settings-grid"><section class="panel"><div class="panel-head"><div class="panel-title">Giao diện & thông báo</div></div><div class="panel-body"><div class="setting-row"><div><strong>Chế độ tối</strong><small>Đổi giao diện cho môi trường thiếu sáng</small></div><input type="checkbox" class="switch" data-setting-theme ${state.theme==='dark'?'checked':''}></div><div class="setting-row"><div><strong>Cảnh báo trùng giờ</strong><small>Nhắc khi một bàn có booking cùng ngày, cùng giờ</small></div><input type="checkbox" class="switch" data-setting-conflict checked></div><div class="setting-row"><div><strong>Nhắc booking chưa đến</strong><small>Hiện các booking chưa check-in trong ngày</small></div><input type="checkbox" class="switch" data-setting-overdue ${state.overdueWarning?'checked':''}></div></div></section><section class="panel"><div class="panel-head"><div class="panel-title">Nhân sự & dữ liệu</div></div><div class="panel-body"><div class="setting-row"><div><strong>Vai trò hiện tại</strong><small>${state.canManageData?'Toàn quyền thao tác và cài đặt':'Nhân viên · thao tác booking'}</small></div><span class="status ${state.canManageData?'deposit':'arrived'}">${state.role}</span></div><div class="setting-row"><div><strong>Lưu trữ</strong><small>Dữ liệu đồng bộ qua Supabase</small></div><span class="status arrived">Đang hoạt động</span></div>${state.canManageData?`<div class="setting-row"><div><strong>Dữ liệu booking</strong><small>${state.bookings.length} booking · ${state.history.length} dòng lịch sử</small></div><button class="btn small danger" data-action="reset-data">${ico('refresh')} Xóa dữ liệu</button></div>`:'<div class="setting-row"><div><strong>Dữ liệu booking</strong><small>${state.bookings.length} booking · ${state.history.length} dòng lịch sử</small></div><span class="status arrived">Chỉ xem</span></div>'}</div></section><section class="panel"><div class="panel-head"><div class="panel-title">Danh sách bàn</div></div><div class="panel-body"><div class="detail-line"><span>Trệt</span><strong>T01 – T08 · 8 bàn</strong></div><div class="detail-line"><span>Lầu 1</span><strong>L101 – L112 · 12 bàn</strong></div><div class="detail-line"><span>Lầu 2</span><strong>L201 – L205 · 5 bàn</strong></div><div class="detail-line"><span>Sân thượng</span><strong>ST01 – ST15 · 15 bàn</strong></div></div></section><section class="panel"><div class="panel-head"><div class="panel-title">Gợi ý vận hành</div></div><div class="panel-body"><p class="note">Để dữ liệu dùng chung giữa nhiều thiết bị và nhân viên, bản vận hành chính thức nên kết nối cơ sở dữ liệu và đăng nhập có phân quyền ở máy chủ. Bản hiện tại lưu trên thiết bị đang mở.</p><p class="note">Thời gian khách lưu trú được đếm từ lúc check-in đến khi hoàn tất booking; hệ thống không đặt sẵn thời lượng ngồi.</p></div></section></div>`}
  return {
    reportsPage,
    historyPage,
    settingsPage
  };
}
