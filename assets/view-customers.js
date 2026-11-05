export function createCustomersViews(context) {
  const {
    ico,
    floors,
    vipTableIds,
    bookingIsOverdue,
    state,
    dateInRange,
    dateRangeText,
    esc,
    money,
    dateLabel,
    statusTag,
    countActualTables,
    pageHead,
    newButton,
    walkInButton
  } = context;
    function customersPage(){
      const q=state.customerSearch.toLowerCase();
      const groups=new Map();
      const addCustomer=(entry)=>{
        const key=entry.type==='walk-in'?'walk-in':(entry.phone||entry.name||'customer').trim().toLowerCase();
        if(!groups.has(key)){
          groups.set(key,{name:entry.type==='walk-in'?'Khách lẻ':entry.name||'Khách hàng',phone:entry.phone||'',type:entry.type||'booking',bookings:[],walkIns:[],walkInNames:new Set(),totalDeposit:0});
        }
        const target=groups.get(key);
        if(entry.type==='walk-in'){
          target.walkIns.push(entry.record);
          if(entry.name)target.walkInNames.add(entry.name);
        }else{
          target.bookings.push(entry.record);
          target.totalDeposit += Number(entry.record.deposit)||0;
        }
      };
      const vipTableIds=new Set(floors.find(floor=>floor.id==='vip')?.tables||[]);
      const isMainVenueRecord=record=>!record.tableIds.some(tableId=>vipTableIds.has(tableId));
      const rangeBookings=state.bookings.filter(booking=>dateInRange(booking.date)&&isMainVenueRecord(booking));
      const rangeWalkIns=state.walkIns.filter(walkIn=>dateInRange(walkIn.date)&&isMainVenueRecord(walkIn));
      rangeBookings.forEach(booking=>addCustomer({name:booking.name,phone:booking.phone||'',type:'booking',record:booking}));
      const customerList=[...groups.values()].filter(customer=>{
        const haystack=`${customer.name} ${customer.phone} ${customer.type} ${[...customer.walkInNames].join(' ')}`.toLowerCase();
        return !q || haystack.includes(q);
      });
      const walkInQuery=state.walkInSearch.trim().toLocaleLowerCase('vi');
      const walkInList=rangeWalkIns.filter(walkIn=>`${walkIn.customerName||'Khách lẻ'} ${walkIn.date} ${dateLabel(walkIn.date,{day:'numeric',month:'short',year:'numeric'})} ${walkIn.time} ${walkIn.tableIds.join(' ')} ${walkIn.guests}`.toLocaleLowerCase('vi').includes(walkInQuery));
      const walkInRows=walkInList.map(walkIn=>`<div class="booking-row" data-customer-walk-in="${walkIn.id}"><div class="time-mark">${esc(walkIn.time)}</div><div class="booking-info"><strong>${esc(walkIn.customerName||'Khách lẻ')} · ${dateLabel(walkIn.date,{day:'numeric',month:'short',year:'numeric'})} · Bàn ${walkIn.tableIds.map(esc).join(' + ')}</strong><small>${walkIn.guests} khách · ${walkIn.status==='arrived'?'Đang sử dụng':'Đã hoàn tất'}</small></div>${statusTag(walkIn.status)}</div>`).join('');
      const walkInEmpty=walkInList.length?'':walkInQuery?'<div class="empty-state">Không tìm thấy lượt khách lẻ phù hợp.</div>':'<div class="empty-state">Chưa có lượt khách lẻ trong khoảng ngày này.</div>';
      return `${pageHead('Hồ sơ khách','Khách hàng',`Khách hàng từ ${dateRangeText()}`,`${newButton()}${walkInButton()}`)}<div class="customer-sections"><details class="customer-group panel" data-customer-group="bookings" ${state.customerBookingsOpen?'open':''}><summary><span class="customer-group-label">Khách đặt bàn</span><span class="customer-group-count">${customerList.length} hồ sơ</span></summary><div class="customer-group-content"><label class="toolbar-search">${ico('search')}<input data-customer-search placeholder="Tìm khách đặt chỗ theo tên hoặc SĐT" value="${esc(state.customerSearch)}"></label><div>${customerList.map(customer=>{
        const totalVisits=customer.bookings.length + customer.walkIns.length;
        const totalGuests=[...customer.bookings,...customer.walkIns].reduce((total,record)=>total+(Number(record.guests)||0),0);
        const actualTables=countActualTables([...customer.bookings,...customer.walkIns]);
        const metaParts=[customer.phone?esc(customer.phone):'Không có SĐT', `${totalVisits} lượt`, `${totalGuests} khách`, `${actualTables} bàn/phòng thực tế`, `Cọc ${money(customer.totalDeposit)}`];
        const isOverdue=customer.bookings.some(booking=>bookingIsOverdue(booking));
        return `<div class="customer-card${isOverdue?' overdue':''}"><div class="customer-head"><div><strong>${esc(customer.name)}</strong>${isOverdue?'<span class="customer-overdue-badge">Quá giờ</span>':''}<div class="customer-meta">Đặt chỗ · ${metaParts.join(' · ')}</div></div><button class="btn small" data-customer-phone="${esc(customer.phone)}" data-customer-venue="gk2">Xem lịch sử</button></div></div>`;
      }).join('')||'<div class="empty-state">Chưa có hồ sơ khách đặt chỗ trong khoảng ngày này.</div>'}</div></div></details><details class="customer-group panel" data-customer-group="walk-ins" ${state.customerWalkInsOpen?'open':''}><summary><span class="customer-group-label">Lịch sử khách lẻ</span><span class="customer-group-count">${walkInList.length} lượt · ${rangeWalkIns.length} lượt trong khoảng ngày</span></summary><div class="customer-group-content"><label class="toolbar-search">${ico('search')}<input data-walk-in-customer-search placeholder="Tìm khách lẻ theo tên, ngày, giờ, bàn hoặc số khách" aria-label="Tìm khách lẻ" value="${esc(state.walkInSearch)}"></label><div class="panel-body">${walkInRows}${walkInEmpty}</div></div></details></div>`;
    }

    function addVipCustomerGroup(){
      if(state.page!=='customers')return;
      const customerSections=document.querySelector('.customer-sections');
      const walkInSection=customerSections?.querySelector('[data-customer-group="walk-ins"]');
      if(!customerSections||!walkInSection)return;
      const vipFloor=floors.find(floor=>floor.id==='vip');
      if(!vipFloor)return;
      const vipTableIds=new Set(vipFloor.tables);
      const query=state.customerSearch.trim().toLocaleLowerCase('vi');
      const customers=new Map();
      state.bookings.filter(booking=>dateInRange(booking.date)&&booking.tableIds.some(tableId=>vipTableIds.has(tableId))).forEach(booking=>{
        const key=(booking.phone||booking.name||'customer').trim().toLocaleLowerCase('vi');
        if(!customers.has(key))customers.set(key,{name:booking.name||'Khách hàng',phone:booking.phone||'',bookings:[]});
        customers.get(key).bookings.push(booking);
      });
      const customerList=[...customers.values()].filter(customer=>!query||`${customer.name} ${customer.phone}`.toLocaleLowerCase('vi').includes(query));
      const group=document.createElement('details');
      group.className='customer-group panel';
      group.dataset.customerGroup='vip3';
      group.open=state.customerVenueOpen.vip3;
      const summary=document.createElement('summary');
      summary.innerHTML=`<span class="customer-group-label">Gánh Kèo VIP</span><span class="customer-group-count">${customerList.length} khách booking · ${[...customers.values()].reduce((total,customer)=>total+customer.bookings.length,0)} lượt</span>`;
      group.append(summary);
      const content=document.createElement('div');
      content.className='customer-group-content';
      const cards=customerList.map(customer=>{
        const bookings=customer.bookings;
        const rooms=[...new Set(bookings.flatMap(booking=>booking.tableIds.filter(tableId=>vipTableIds.has(tableId))))];
        const guests=bookings.reduce((total,booking)=>total+(Number(booking.guests)||0),0);
        const deposit=bookings.reduce((total,booking)=>total+(Number(booking.deposit)||0),0);
        return `<div class="customer-card"><div class="customer-head"><div><strong>${esc(customer.name)}</strong><div class="customer-meta">Phòng ${rooms.map(esc).join(' · ')} · ${customer.phone?esc(customer.phone):'Không có SĐT'} · ${bookings.length} lượt VIP · ${guests} khách · Cọc ${money(deposit)}</div></div><button class="btn small" data-customer-phone="${esc(customer.phone)}" data-customer-venue="vip3">Xem lịch sử</button></div></div>`;
      }).join('');
      content.innerHTML=`<section class="customer-flow-section"><h3>Khách booking <span>${customerList.length} hồ sơ</span></h3>${cards||`<div class="empty-state">${query?'Không tìm thấy khách VIP phù hợp trong khoảng ngày này.':'Chưa có khách đặt phòng VIP trong khoảng ngày này.'}</div>`}</section>`;
      const walkInQuery=state.walkInSearch.trim().toLocaleLowerCase('vi');
      const vipWalkIns=state.walkIns.filter(walkIn=>dateInRange(walkIn.date)&&walkIn.tableIds.some(tableId=>vipTableIds.has(tableId)));
      const visibleWalkIns=vipWalkIns.filter(walkIn=>`${walkIn.customerName||'Khách lẻ'} ${walkIn.date} ${dateLabel(walkIn.date,{day:'numeric',month:'short',year:'numeric'})} ${walkIn.time} ${walkIn.tableIds.join(' ')} ${walkIn.guests}`.toLocaleLowerCase('vi').includes(walkInQuery));
      const walkInRows=visibleWalkIns.map(walkIn=>`<div class="booking-row" data-customer-walk-in="${walkIn.id}"><div class="time-mark">${esc(walkIn.time)}</div><div class="booking-info"><strong>${esc(walkIn.customerName||'Khách lẻ')} · ${dateLabel(walkIn.date,{day:'numeric',month:'short',year:'numeric'})} · Phòng ${walkIn.tableIds.filter(tableId=>vipTableIds.has(tableId)).map(esc).join(' + ')}</strong><small>${walkIn.guests} khách · ${walkIn.status==='arrived'?'Đang sử dụng':walkIn.status==='cancelled'?'Đã hủy':'Đã hoàn tất'}</small></div>${statusTag(walkIn.status)}</div>`).join('');
      const walkInEmpty=walkInRows?'':walkInQuery?'<div class="empty-state">Không tìm thấy lượt khách VIP phù hợp.</div>':'<div class="empty-state">Chưa có khách lẻ VIP trong khoảng ngày này.</div>';
      content.insertAdjacentHTML('beforeend',`<section class="customer-flow-section"><h3>Khách lẻ <span>${visibleWalkIns.length} lượt · ${vipWalkIns.length} lượt</span></h3><div class="panel-body">${walkInRows}${walkInEmpty}</div></section>`);
      group.append(content);
      customerSections.insertBefore(group,walkInSection);
    }

    function organizeCustomerVenues(){
      if(state.page!=='customers')return;
      const container=document.querySelector('.customer-sections');
      const bookingGroup=container?.querySelector('[data-customer-group="bookings"]');
      const walkInGroup=container?.querySelector('[data-customer-group="walk-ins"]');
      const vipGroup=container?.querySelector('[data-customer-group="vip3"]');
      if(!container||!bookingGroup||!walkInGroup||!vipGroup)return;
      const bookingContent=bookingGroup.querySelector('.customer-group-content');
      const walkInContent=walkInGroup.querySelector('.customer-group-content');
      const vipContent=vipGroup.querySelector('.customer-group-content');
      const bookingSearch=bookingContent?.querySelector('.toolbar-search');
      const walkInSearch=walkInContent?.querySelector('.toolbar-search');
      if(!bookingContent||!walkInContent||!vipContent||!bookingSearch||!walkInSearch)return;

      const filters=document.createElement('div');
      filters.className='customer-search-filters filters';
      filters.append(bookingSearch,walkInSearch);
      container.before(filters);

      const mainBookings=document.createElement('section');
      mainBookings.className='customer-flow-section';
      mainBookings.innerHTML=`<h3>Khách booking <span>${bookingGroup.querySelector('.customer-group-count')?.textContent||''}</span></h3>`;
      mainBookings.append(bookingContent);
      const mainWalkIns=document.createElement('section');
      mainWalkIns.className='customer-flow-section';
      mainWalkIns.innerHTML=`<h3>Khách lẻ <span>${walkInGroup.querySelector('.customer-group-count')?.textContent||''}</span></h3>`;
      mainWalkIns.append(walkInContent);

      const mainSummary=bookingGroup.querySelector('summary');
      mainSummary.innerHTML='<span class="customer-group-label">Gánh Kèo 2</span><span class="customer-group-count">Khu bàn nhà hàng</span>';
      const mainContent=document.createElement('div');
      mainContent.className='customer-venue-content';
      mainContent.append(mainBookings,mainWalkIns);
      bookingGroup.replaceChildren(mainSummary,mainContent);
      bookingGroup.dataset.customerGroup='gk2';
      bookingGroup.open=state.customerVenueOpen.gk2;
      walkInGroup.remove();

      const vipSummary=vipGroup.querySelector('summary');
      const vipBookings=vipContent.querySelector('.customer-flow-section');
      const vipWalkIns=vipContent.querySelectorAll('.customer-flow-section')[1];
      if(vipSummary&&vipBookings&&vipWalkIns){
        vipSummary.innerHTML='<span class="customer-group-label">Gánh Kèo VIP</span><span class="customer-group-count">Khu phòng VIP</span>';
        const venueContent=document.createElement('div');
        venueContent.className='customer-venue-content';
        venueContent.append(vipBookings,vipWalkIns);
        makeCustomerFlowCollapsible(vipBookings,'vip3Booking');
        makeCustomerFlowCollapsible(vipWalkIns,'vip3WalkIn');
        vipGroup.replaceChildren(vipSummary,venueContent);
        vipGroup.open=state.customerVenueOpen.vip3;
      }
      makeCustomerFlowCollapsible(mainBookings,'gk2Booking');
      makeCustomerFlowCollapsible(mainWalkIns,'gk2WalkIn');
      container.replaceChildren(bookingGroup,vipGroup);
    }

    function makeCustomerFlowCollapsible(section,key){
      const heading=section.querySelector('h3');
      if(!heading)return;
      const label=heading.childNodes[0]?.textContent.trim()||heading.textContent.trim();
      const count=heading.querySelector('span')?.textContent.trim()||'';
      const details=document.createElement('details');
      details.className='customer-flow-toggle';
      details.dataset.customerFlow=key;
      details.open=state.customerFlowOpen[key]||false;
      const summary=document.createElement('summary');
      const title=document.createElement('span');
      title.textContent=label;
      const countLabel=document.createElement('span');
      countLabel.className='customer-flow-count';
      countLabel.textContent=count;
      summary.append(title,countLabel);
      const content=document.createElement('div');
      content.className='customer-flow-scroll';
      [...section.childNodes].forEach(node=>{if(node!==heading)content.append(node)});
      details.append(summary,content);
      section.replaceChildren(details);
    }
  return {
    customersPage,
    addVipCustomerGroup,
    organizeCustomerVenues,
    makeCustomerFlowCollapsible
  };
}
