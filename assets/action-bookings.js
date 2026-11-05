export function createBookingsActions(context) {
  const {
    supabase,
    baselineBookings,
    icon,
    ico,
    floors,
    allTables,
    floorUnit,
    statusNames,
    normalizeBookingStatus,
    bookingDisplayStatus,
    state,
    dateInRange,
    bookingToRow,
    loadSharedData,
    updateSharedCompletion,
    save,
    esc,
    money,
    dateLabel,
    statusTag,
    displayTables,
    tablePickLabel,
    showTablePickerStatus,
    visibleFloorTableIds,
    render,
    getPersistenceQueue,
    audit,
    toast,
    closeModal,
    updateElapsed
  } = context;
    function buildGroupedTablePicker(buttons,date=state.date){
      const grouped=document.createElement('div');
      grouped.className='table-pick-groups';
      floors.forEach(floor=>{
        const unit=floorUnit(floor);
        const section=document.createElement('section');
        section.className='table-pick-floor';
        const floorHead=document.createElement('div');
        floorHead.className='table-pick-floor-head';
        const floorName=document.createElement('strong');
        floorName.textContent=floor.name;
        const floorDisplayTables=visibleFloorTableIds(floor);
        const floorCount=document.createElement('span');
        floorCount.textContent=`${floorDisplayTables.length} ${unit}`;
        floorHead.append(floorName,floorCount);
        section.append(floorHead);
        const areas=[...new Set(floorDisplayTables.map(id=>floor.zones[id]||'Khu vực chung'))];
        areas.forEach(name=>{
          const ids=floorDisplayTables.filter(id=>(floor.zones[id]||'Khu vực chung')===name);
          const area=document.createElement('div');
          area.className='table-pick-area';
          const areaHead=document.createElement('div');
          areaHead.className='table-pick-area-head';
          const areaName=document.createElement('span');
          areaName.textContent=name;
          const areaCount=document.createElement('span');
          areaCount.textContent=`${ids.length} ${unit}`;
          areaHead.append(areaName,areaCount);
          const grid=document.createElement('div');
          grid.className='table-picker grouped';
          ids.forEach(id=>{
            const button=buttons.get(id);
            if(button){showTablePickerStatus(button,id,date);grid.append(button)}
          });
          area.append(areaHead,grid);
          section.append(area);
        });
        grouped.append(section);
      });
      return grouped;
    }

    function groupBookingPicker(){const picker=document.querySelector('#booking-form .table-picker');if(!picker)return;const buttons=new Map([...picker.querySelectorAll('[data-pick-table]')].map(button=>[button.dataset.pickTable,button]));const date=document.querySelector('#booking-date')?.value||state.date;picker.replaceWith(buildGroupedTablePicker(buttons,date));const label=document.querySelector('#booking-form .table-pick-groups')?.closest('.field')?.querySelector('label');if(label)label.textContent='Bàn / phòng (chọn một hoặc nhiều)'}

    function refreshBookingPicker(date){document.querySelectorAll('#booking-form [data-pick-table]').forEach(button=>showTablePickerStatus(button,button.dataset.pickTable,date))}
    document.addEventListener('change',event=>{if(event.target.id==='booking-date')refreshBookingPicker(event.target.value)});

    function modal(title,subtitle,body,foot='',narrow=false){
      document.getElementById('modal-root').innerHTML=`<div class="backdrop" data-action="backdrop-close"><section class="modal ${narrow?'narrow':''}" role="dialog" aria-modal="true"><div class="modal-head"><div><div class="modal-title">${title}</div><div class="modal-sub">${subtitle||''}</div></div><button class="icon-btn" data-action="close-modal" aria-label="Đóng">${ico('close')}</button></div><div class="modal-body">${body}</div>${foot?`<div class="modal-foot">${foot}</div>`:''}</section></div>`;
      if(!state.canManageData)document.querySelectorAll('[data-action="delete-booking"],[data-action="split-this"]').forEach(button=>button.remove());
      if(state.modal?.type==='booking'&&!state.modal.id)document.querySelector('#booking-time').value='';
      if(state.modal?.type==='booking'){
        groupBookingPicker();
        const phoneInput=document.querySelector('#guest-phone'),phoneLabel=document.querySelector('label[for="guest-phone"]');
        if(phoneInput)phoneInput.required=false;
        if(phoneLabel)phoneLabel.textContent='Số điện thoại';
      }
      document.querySelectorAll('.modal .detail-line > span').forEach(label=>{
        if(label.textContent.trim()==='Bàn')label.textContent='Bàn / phòng';
      });
      document.querySelector('.modal')?.addEventListener('click',e=>e.stopPropagation());
      document.querySelectorAll('.modal [data-action="close-modal"]').forEach(button=>button.addEventListener('click',closeModal));
      document.querySelector('.backdrop')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});
    }

    function openBooking(id=null,defaultTables=[]){const b=state.bookings.find(x=>x.id===id);const picked=new Set(b?.tableIds||defaultTables);state.modal={type:'booking',id,picked};const tableChoices=floors.map(f=>`<div class="field full"><label>${f.name}</label><div class="table-picker">${visibleFloorTableIds(f).map(t=>tablePickLabel(t,picked,'pick')).join('')}</div></div>`).join('');const book= b||{name:'',phone:'',guests:2,date:state.date,time:'19:00',deposit:0,note:'',status:'confirmed'};const foot=`<button class="btn danger" data-action="delete-booking" ${b?'':'hidden'}>${ico('trash')} Xóa booking</button><span class="spacer"></span><button class="btn" data-action="close-modal">Hủy</button><button class="btn primary" data-action="save-booking">${ico('check')} ${b?'Lưu thay đổi':'Tạo booking'}</button>`;modal(b?'Chi tiết & chỉnh sửa booking':'Tạo booking mới',b?`${esc(b.name)} · tạo ${new Date(b.created||Date.now()).toLocaleDateString('vi-VN')}`:'Thông tin khách, bàn và trạng thái đặt chỗ',`<div id="conflict-warning"></div><form id="booking-form" class="form-grid"><div class="field"><label for="guest-name">Tên khách *</label><input id="guest-name" name="name" required value="${esc(book.name)}" placeholder="Nguyễn Văn A"></div><div class="field"><label for="guest-phone">Số điện thoại *</label><input id="guest-phone" name="phone" required inputmode="tel" value="${esc(book.phone)}" placeholder="09xx xxx xxx"></div><div class="field"><label for="guest-count">Số lượng khách</label><input id="guest-count" name="guests" type="number" min="1" value="${book.guests}"></div><div class="field"><label for="booking-status">Trạng thái khách</label><select id="booking-status" name="status">${Object.entries(statusNames).map(([k,v])=>`<option value="${k}" ${book.status===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label for="booking-date">Ngày đặt</label><input id="booking-date" name="date" type="date" required value="${book.date}"></div><div class="field"><label for="booking-time">Giờ đến (không bắt buộc)</label><input id="booking-time" name="time" type="time" value="${book.time}"></div><div class="field"><label for="booking-deposit">Tiền cọc (₫)</label><input id="booking-deposit" name="deposit" type="number" min="0" step="50000" value="${book.deposit}"></div><div class="field"><label>Thời gian khách</label><div class="note" style="padding:10px 0">${b?.checkIn&&b.status==='arrived'?`Đang dùng bàn · <span class="elapsed" data-elapsed="${b.checkIn}"></span>`:'Chỉ bắt đầu tính khi khách check-in'}</div></div><div class="field full"><label>Bàn (chọn một hoặc nhiều bàn)</label><div class="table-picker">${allTables.map(t=>`<button type="button" class="table-pick ${picked.has(t.id)?'selected':''}" data-pick-table="${t.id}" title="${t.floor} · ${t.zone}">${t.id}</button>`).join('')}</div><div class="note" id="picked-label">${picked.size?`Đã chọn: ${[...picked].join(' + ')}`:'Chưa chọn bàn'}</div></div><div class="field full"><label for="booking-note">Ghi chú</label><textarea id="booking-note" name="note" placeholder="Dị ứng, sinh nhật, khách lẻ, vị trí yêu thích...">${esc(book.note)}</textarea></div></form>`,foot);document.querySelectorAll('[data-pick-table]').forEach(btn=>btn.addEventListener('click',()=>{const t=btn.dataset.pickTable;if(state.modal.picked.has(t))state.modal.picked.delete(t);else state.modal.picked.add(t);btn.classList.toggle('selected');document.getElementById('picked-label').textContent=state.modal.picked.size?`Đã chọn: ${[...state.modal.picked].join(' + ')}`:'Chưa chọn bàn'}));if(b){document.querySelector('[data-action="delete-booking"]').addEventListener('click',deleteCurrentBooking)}document.querySelector('[data-action="save-booking"]').addEventListener('click',saveBooking);updateElapsed();}

    function saveBooking(){
      const form=document.getElementById('booking-form');
      if(!form.reportValidity())return;
      const data=Object.fromEntries(new FormData(form));
      if(!state.modal.picked.size){toast('Chọn ít nhất một bàn trước khi lưu');return}
      const id=state.modal.id;
      const bookingConflicts=state.bookings.filter(b=>b.id!==id&&b.date===data.date&&b.tableIds.some(t=>state.modal.picked.has(t))&&!['cancelled','completed','no-show'].includes(b.status));
      const walkInConflicts=state.walkIns.filter(walkIn=>walkIn.date===data.date&&walkIn.status==='arrived'&&walkIn.tableIds.some(tableId=>state.modal.picked.has(tableId)));
      const conflicts=[...bookingConflicts.map(booking=>({kind:'Booking',name:booking.name,time:booking.time,tableIds:booking.tableIds})),...walkInConflicts.map(walkIn=>({kind:'Khách lẻ',name:walkIn.customerName||'Khách lẻ',time:walkIn.time,tableIds:walkIn.tableIds}))];
      const warning=document.getElementById('conflict-warning');
      if(state.conflictWarning&&conflicts.length&&!warning.dataset.confirmed){
        showTableConflictConfirmation(data.date,data.time,[...state.modal.picked],conflicts,'Vẫn tạo booking',()=>{warning.dataset.confirmed='yes';saveBooking()});
        return;
      }
      const old=state.bookings.find(b=>b.id===id);
      const booking={...(old||{}),id:id||`gk${Date.now()}`,name:data.name.trim(),phone:data.phone.trim(),guests:Math.max(1,+data.guests||1),date:data.date,time:data.time,deposit:Math.max(0,+data.deposit||0),note:data.note.trim(),status:normalizeBookingStatus(data.status),tableIds:[...state.modal.picked],created:old?.created||new Date().toISOString()};
      if(booking.status==='arrived'&&!booking.checkIn)booking.checkIn=new Date().toISOString();
      if(booking.status!=='arrived'&&old?.status==='arrived')booking.checkIn=null;
      if(booking.status==='completed')booking.completedAt=new Date().toISOString();
      if(booking.status==='cancelled'&&old?.status!=='cancelled')booking.cancelledAt=new Date().toISOString();
      if(booking.status!=='cancelled'&&old?.status==='cancelled')booking.cancelledAt=null;
      if(old){state.bookings=state.bookings.map(x=>x.id===id?booking:x);const action=old.status!=='cancelled'&&booking.status==='cancelled'?'Hủy booking':old.status==='cancelled'&&booking.status!=='cancelled'?'Khôi phục booking':'Chỉnh sửa booking';audit(action,`${booking.name} · ${displayTables(booking)}`)}
      else{state.bookings.push(booking);audit('Tạo booking',`${booking.name} · ${displayTables(booking)} · ${booking.date}${booking.time?` ${booking.time}`:''}`)}
      state.date=booking.date;save();closeModal();render();toast(old?'Đã cập nhật booking':'Đã tạo booking mới');
    }

    function showTableConflictConfirmation(date,time,tableIds,conflicts,confirmLabel,onConfirm){const overlappingTables=[...new Set(conflicts.flatMap(conflict=>conflict.tableIds.filter(tableId=>tableIds.includes(tableId))))];showConfirmation({title:'Bàn đã có khách/booking',message:`Bàn ${overlappingTables.join(' + ')} đã có booking hoặc khách lẻ trong ngày. Bạn có chắc chắn muốn tiếp tục không?`,details:[{label:'Ngày giờ mới',value:`${dateLabel(date,{day:'numeric',month:'long',year:'numeric'})} · ${time||'Chưa chọn giờ'}`},...conflicts.map(conflict=>({label:conflict.kind,value:`${conflict.name} · ${conflict.time||'Chưa chọn giờ'} · bàn ${conflict.tableIds.filter(tableId=>tableIds.includes(tableId)).join(' + ')}`}))],confirmLabel,iconName:'clock',tone:'danger',onConfirm})}

    function showConfirmation({title,message,details,confirmLabel,iconName='close',tone='danger',onConfirm}){const root=document.getElementById('modal-root'),layer=document.createElement('div');layer.className='confirm-backdrop';layer.innerHTML=`<section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><div class="confirm-heading"><div class="confirm-symbol ${tone==='success'?'success':''}">${ico(iconName)}</div><div><div class="confirm-kicker">Xác nhận thao tác</div><h2 class="confirm-title" id="confirm-title">${esc(title)}</h2></div><button type="button" class="icon-btn" data-confirm-dismiss aria-label="Đóng">${ico('close')}</button></div><p class="confirm-copy">${esc(message)}</p><div class="confirm-details">${details.map(item=>`<div class="confirm-detail"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></div>`).join('')}</div><div class="confirm-actions"><button type="button" class="btn" data-confirm-dismiss>Quay lại</button><button type="button" class="btn ${tone==='success'?'primary':'danger'}" data-confirm-accept>${ico(iconName)} ${esc(confirmLabel)}</button></div></section>`;root.append(layer);const dismiss=()=>layer.remove();layer.addEventListener('click',event=>{if(event.target===layer)dismiss()});layer.querySelectorAll('[data-confirm-dismiss]').forEach(button=>button.addEventListener('click',dismiss));layer.querySelector('[data-confirm-accept]').addEventListener('click',()=>{dismiss();onConfirm()});layer.querySelector('[data-confirm-dismiss]')?.focus()}

    function showDeletePasswordConfirmation(onConfirm){
      const root=document.getElementById('modal-root');
      const layer=document.createElement('div');
      layer.className='confirm-backdrop';
      layer.innerHTML=`<section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-password-title"><div class="confirm-heading"><div class="confirm-symbol danger">${ico('lock')}</div><div><div class="confirm-kicker">Bảo mật dữ liệu</div><h2 class="confirm-title" id="delete-password-title">Xác nhận xoá dữ liệu</h2></div><button type="button" class="icon-btn" data-confirm-dismiss aria-label="Đóng">${ico('close')}</button></div><p class="confirm-copy">Nhập mật khẩu đã thiết lập trong Cài đặt. Toàn bộ booking, khách lẻ, lịch sử và nhóm bàn sẽ bị xoá vĩnh viễn.</p><div class="confirm-details"><div class="confirm-detail" style="grid-template-columns:82px minmax(0,1fr);align-items:center"><span>Mật khẩu</span><input id="delete-password-input" type="password" placeholder="Nhập mật khẩu xoá dữ liệu" style="grid-column:2;width:100%;height:38px;border:1px solid var(--line);border-radius:8px;padding:0 10px;background:var(--paper);color:var(--ink);font:inherit" autocomplete="current-password" /></div></div><div class="confirm-actions"><button type="button" class="btn" data-confirm-dismiss>Quay lại</button><button type="button" class="btn danger" data-confirm-accept>${ico('trash')} Xác nhận xoá</button></div></section>`;
      root.appendChild(layer);
      const dismiss=()=>layer.remove();
      const input=layer.querySelector('#delete-password-input');
      input?.focus();
      layer.addEventListener('click',event=>{if(event.target===layer)dismiss()});
      layer.querySelectorAll('[data-confirm-dismiss]').forEach(button=>button.addEventListener('click',dismiss));
      layer.querySelector('[data-confirm-accept]').addEventListener('click',async event=>{
        const password=input.value;
        if(!password){toast('Vui lòng nhập mật khẩu để xác nhận');input.focus();return}
        const button=event.currentTarget;button.disabled=true;
        try{
          await getPersistenceQueue();
          const {error}=await supabase.rpc('reset_all_app_data',{p_password:password});
          if(error)throw error;
          dismiss();onConfirm();
        }catch(error){toast(error.message||'Không thể xoá dữ liệu.');button.disabled=false;input.focus()}
      });
    }

    function deleteCurrentBooking(){if(!state.canManageData)return;const id=state.modal.id,b=state.bookings.find(x=>x.id===id);if(!b)return;showConfirmation({title:'Xóa booking này?',message:'Booking sẽ bị xóa khỏi dữ liệu dùng chung và không lưu lại.',confirmLabel:'Xóa booking',iconName:'trash',details:[{label:'Khách',value:b.name},{label:'Thời gian',value:`${b.date} · ${b.time}`},{label:'Bàn',value:displayTables(b)}],onConfirm:()=>{state.bookings=state.bookings.filter(x=>x.id!==id);save();closeModal();render();toast('Đã xóa booking')}})}

    function openTableChange(kind,id){
      const item=kind==='booking'?state.bookings.find(booking=>booking.id===id):state.walkIns.find(walkIn=>walkIn.id===id&&walkIn.status==='arrived');if(!item)return;
      const picked=new Set(item.tableIds);state.modal={type:'table-change',kind,id,picked};
      const buttons=new Map();
      floors.forEach(floor=>visibleFloorTableIds(floor).forEach(tableId=>{const button=document.createElement('button');button.type='button';button.className=`table-pick ${picked.has(tableId)?'selected':''}`;button.dataset.tableChangeChoice=tableId;button.innerHTML=`<span>${tableId}</span>`;showTablePickerStatus(button,tableId);buttons.set(tableId,button)}));
      const guestName=kind==='booking'?item.name:(item.customerName||'Khách lẻ');
      modal('Đổi bàn',`${esc(guestName)} · ${item.date} ${item.time}` ,`<div id="table-change-picker"></div><div class="note" id="table-change-picked">Đã chọn: ${[...picked].map(esc).join(' + ')}</div>`,`<button class="btn" data-action="close-modal">Hủy</button><span class="spacer"></span><button class="btn primary" data-action="save-table-change">${ico('check')} Xác nhận đổi bàn</button>`);
      document.getElementById('table-change-picker').replaceWith(buildGroupedTablePicker(buttons));
      document.querySelectorAll('[data-table-change-choice]').forEach(button=>button.addEventListener('click',()=>{const tableId=button.dataset.tableChangeChoice;if(picked.has(tableId))picked.delete(tableId);else picked.add(tableId);button.classList.toggle('selected',picked.has(tableId));document.getElementById('table-change-picked').textContent=picked.size?`Đã chọn: ${[...picked].join(' + ')}`:'Chọn ít nhất một bàn'}));
      document.querySelector('[data-action="save-table-change"]').addEventListener('click',saveTableChange);
    }

    function saveTableChange(){
      const {kind,id,picked}=state.modal||{};if(!picked?.size){toast('Chọn ít nhất một bàn');return}
      const item=kind==='booking'?state.bookings.find(booking=>booking.id===id):state.walkIns.find(walkIn=>walkIn.id===id&&walkIn.status==='arrived');if(!item)return;
      const conflictsWithBooking=state.bookings.some(booking=>booking.id!==id&&booking.date===item.date&&booking.time===item.time&&booking.tableIds.some(tableId=>picked.has(tableId))&&!['cancelled','completed','no-show'].includes(booking.status));
      const conflictsWithWalkIn=state.walkIns.some(walkIn=>walkIn.id!==id&&walkIn.date===item.date&&walkIn.time===item.time&&walkIn.status==='arrived'&&walkIn.tableIds.some(tableId=>picked.has(tableId)));
      if(conflictsWithBooking||conflictsWithWalkIn){toast('Bàn đã có khách trong khung giờ này');return}
      const previous=item.tableIds.join(' + '),next=[...picked];item.tableIds=next;
      const guestName=kind==='booking'?item.name:(item.customerName||'Khách lẻ');audit('Đổi bàn',`${guestName} · ${previous} → ${next.join(' + ')}`);save();closeModal();render();toast(`Đã đổi bàn sang ${next.join(' + ')}`);
    }

    function checkIn(id){const b=state.bookings.find(x=>x.id===id);if(!b||!['confirmed'].includes(b.status))return;showConfirmation({title:'Xác nhận khách đã đến?',message:'Bộ đếm thời gian lưu trú sẽ bắt đầu ngay khi xác nhận check-in.',confirmLabel:'Check-in',iconName:'check',tone:'success',details:[{label:'Khách',value:b.name},{label:'Thời gian',value:`${dateLabel(b.date,{day:'numeric',month:'short',year:'numeric'})} · ${b.time}`},{label:'Bàn',value:displayTables(b)},{label:'Số khách',value:`${b.guests} khách`}],onConfirm:()=>{b.status='arrived';b.checkIn=new Date().toISOString();audit('Check-in khách',`${b.name} · ${displayTables(b)}`);save();closeModal();render();toast(`Đã check-in ${b.name}. Bắt đầu tính thời gian.`)}})}

    function completeBooking(id){const b=state.bookings.find(x=>x.id===id);if(!b||b.status!=='arrived')return;showConfirmation({title:'Xác nhận hoàn tất booking?',message:'Bộ đếm thời gian lưu trú sẽ dừng sau khi xác nhận hoàn tất.',confirmLabel:'Xác nhận hoàn tất',iconName:'check',tone:'success',details:[{label:'Khách',value:b.name},{label:'Bàn',value:displayTables(b)},{label:'Số khách',value:`${b.guests} khách`},{label:'Đã dùng bàn',value:b.checkIn?document.querySelector(`[data-elapsed="${CSS.escape(b.checkIn)}"]`)?.textContent||'Đang cập nhật':'Không có dữ liệu'}],onConfirm:async()=>{
      const completedAt=new Date().toISOString();
      try{
        const updated=await updateSharedCompletion('bookings',b.id,completedAt);
        if(!updated){await loadSharedData();closeModal();render();toast('Booking đã được cập nhật ở thiết bị khác');return}
        b.status='completed';b.completedAt=completedAt;baselineBookings.set(b.id,bookingToRow(b));
        audit('Hoàn tất booking',`${b.name} · ${displayTables(b)}`);closeModal();render();toast('Đã hoàn tất booking');
      }catch(error){console.error(error);toast('Không lưu được trạng thái hoàn tất. Kiểm tra kết nối rồi thử lại.')}
    }})}

    function cancelBooking(id){const b=state.bookings.find(x=>x.id===id);if(!b||b.status==='cancelled')return;showConfirmation({title:'Hủy booking này?',message:'Bàn sẽ được giải phóng; thông tin booking vẫn được lưu trong lịch sử.',confirmLabel:'Hủy booking',iconName:'close',details:[{label:'Khách',value:b.name},{label:'Thời gian',value:`${dateLabel(b.date,{day:'numeric',month:'short',year:'numeric'})} · ${b.time}`},{label:'Bàn',value:displayTables(b)},{label:'Số khách',value:`${b.guests} khách`}],onConfirm:()=>{b.status='cancelled';b.cancelledAt=new Date().toISOString();audit('Hủy booking',`${b.name} · ${b.date} ${b.time} · ${displayTables(b)}`);save();closeModal();render();toast(`Đã hủy booking của ${b.name}`)}})}

    function openBookingDetail(id){const b=state.bookings.find(x=>x.id===id);if(!b)return;state.modal={type:'detail',id:b.id};const elapsed=b.checkIn&&b.status==='arrived'?`<div class="detail-line"><span>Khách đã dùng bàn</span><strong class="elapsed" data-elapsed="${b.checkIn}"></strong></div>`:'';const hasCheck=['confirmed'].includes(b.status);const canCancel=!['cancelled','completed','no-show'].includes(b.status);modal(esc(b.name),`${esc(b.phone)} · ${b.guests} khách`,`<div class="detail-line"><span>Ngày & giờ</span><strong>${dateLabel(b.date,{day:'numeric',month:'long',year:'numeric'})} · ${b.time}</strong></div><div class="detail-line"><span>Bàn</span><strong>${displayTables(b)}</strong></div><div class="detail-line"><span>Trạng thái</span>${statusTag(bookingDisplayStatus(b))}</div><div class="detail-line"><span>Số lượng khách</span><strong>${b.guests} khách</strong></div><div class="detail-line"><span>Tiền cọc</span><strong>${money(b.deposit)}</strong></div>${elapsed}${b.note?`<div class="detail-note"><strong>Ghi chú</strong><br>${esc(b.note)}</div>`:''}<div class="detail-actions" style="margin-top:14px">${hasCheck?`<button class="btn primary small" data-detail-checkin="${b.id}">${ico('check')} Check-in</button>`:''}${b.status==='arrived'?`<button class="btn soft small" data-complete="${b.id}">${ico('check')} Hoàn tất</button>`:''}${canCancel?`<button class="btn danger small" data-cancel-booking="${b.id}">${ico('close')} Hủy booking</button>`:''}${b.status==='completed'?`<span class="note">Hoàn tất ${b.completedAt?new Date(b.completedAt).toLocaleString('vi-VN'):''}</span>`:''}${b.status==='cancelled'&&b.cancelledAt?`<span class="note">Đã hủy ${new Date(b.cancelledAt).toLocaleString('vi-VN')}</span>`:''}</div>`,`<button class="btn" data-action="close-modal">Đóng</button><span class="spacer"></span><button class="btn" data-action="edit-booking" data-id="${b.id}">${ico('edit')} Chỉnh sửa / chuyển bàn</button>`);document.querySelector('[data-detail-checkin]')?.addEventListener('click',()=>checkIn(b.id));document.querySelector('[data-complete]')?.addEventListener('click',()=>completeBooking(b.id));document.querySelector('[data-cancel-booking]')?.addEventListener('click',()=>cancelBooking(b.id));document.querySelector('[data-action="edit-booking"]').addEventListener('click',()=>openBooking(b.id));updateElapsed()}

    function exportCsv(){const rows=state.bookings.filter(b=>dateInRange(b.date));const csv=[['Ngày','Giờ','Tên khách','Điện thoại','Số khách','Bàn / phòng','Tiền cọc','Trạng thái','Ghi chú'],...rows.map(b=>[b.date,b.time,b.name,b.phone,b.guests,b.tableIds.join(' + '),b.deposit,statusNames[b.status],b.note])].map(row=>row.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download=`ganh-keo-booking-${state.dateFrom}-${state.dateTo}.csv`;a.click();URL.revokeObjectURL(a.href)}
  return {
    buildGroupedTablePicker,
    groupBookingPicker,
    refreshBookingPicker,
    modal,
    openBooking,
    saveBooking,
    showTableConflictConfirmation,
    showConfirmation,
    showDeletePasswordConfirmation,
    deleteCurrentBooking,
    openTableChange,
    saveTableChange,
    checkIn,
    completeBooking,
    cancelBooking,
    openBookingDetail,
    exportCsv
  };
}
