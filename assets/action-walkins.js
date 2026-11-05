export function createWalkinsActions(context) {
  const {
    baselineWalkIns,
    ico,
    floors,
    state,
    dateInRange,
    walkInToRow,
    loadSharedData,
    updateSharedCompletion,
    save,
    esc,
    dateLabel,
    statusTag,
    walkInDisplayName,
    walkInDisplayCount,
    shell,
    tablePickLabel,
    visibleFloorTableIds,
    render,
    getCurrentUser,
    audit,
    toast,
    closeModal,
    buildGroupedTablePicker,
    modal,
    showTableConflictConfirmation,
    showConfirmation,
    checkIn
  } = context;
    function deleteWalkIn(id){const walkIn=state.walkIns.find(item=>item.id===id);if(!walkIn)return;showConfirmation({title:'Xóa khách lẻ này?',message:'Khách lẻ sẽ bị xóa khỏi dữ liệu và không lưu lại.',confirmLabel:'Xóa khách lẻ',iconName:'trash',details:[{label:'Khách',value:walkIn.customerName||'Khách lẻ'},{label:'Bàn',value:walkIn.tableIds.join(' + ')},{label:'Ngày',value:walkIn.date},{label:'Số khách',value:`${walkIn.guests} khách`}],onConfirm:()=>{state.walkIns=state.walkIns.filter(item=>item.id!==id);save();closeModal();render();toast('Đã xóa khách lẻ')}})}

    function groupWalkInPicker(){const picker=document.querySelector('#walk-in-form .table-pick-groups');if(!picker)return;const buttons=new Map([...picker.querySelectorAll('[data-walk-in-table]')].map(button=>[button.dataset.walkInTable,button]));picker.replaceWith(buildGroupedTablePicker(buttons));const label=document.querySelector('#walk-in-form .table-pick-groups')?.closest('.field')?.querySelector('label');if(label)label.textContent='Bàn / phòng khách sử dụng *'}

    function openWalkIn(defaultTables=[], id=null){
      const existing= id ? state.walkIns.find(item=>item.id===id) : null;
      const picked=new Set(existing?.tableIds || defaultTables),now=new Date(),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      state.modal={type:'walk-in',id:existing?.id||null,picked};
      const tables=floors.map(floor=>`<div class="field full"><label>${floor.name}</label><div class="table-picker">${visibleFloorTableIds(floor).map(tableId=>tablePickLabel(tableId,picked,'walk-in')).join('')}</div></div>`).join('');
      const activeTableNote=[...picked].some(tableId=>state.walkIns.some(walkIn=>walkIn.id!==existing?.id&&walkIn.date===state.date&&walkIn.status==='arrived'&&walkIn.tableIds.includes(tableId))) ? '<div class="note" style="color:var(--warning);margin-top:8px">Bàn đang có lượt khách lẻ đang phục vụ. Hệ thống sẽ ghi nhận lượt mới thay vì gộp vào lượt cũ.</div>' : '';
      const walkInDefault=existing?{...existing,customerName:existing.customerName==='Khách lẻ'?'':existing.customerName}:{guests:2,date:state.date,customerName:'',tableIds:[]};
      const summaryLabel=existing?`${esc(existing.customerName||'Khách lẻ')} · ${existing.guests} khách`:'Khách lẻ mới';
      const dateField=existing?`<div class="field"><label for="walk-in-date">Ngày *</label><input id="walk-in-date" name="date" type="date" value="${walkInDefault.date}" required></div>`:'';
      const body=`<div class="walkin-form-shell"><div class="walkin-summary"><strong>${summaryLabel}</strong><span class="walkin-badge">${existing?'Sửa':'Mới'}</span></div><form id="walk-in-form"><div class="field"><label for="walk-in-guests">Số khách thêm / mới *</label><input id="walk-in-guests" name="guests" type="number" min="1" value="${walkInDefault.guests}" required></div>${dateField}<div class="field full"><label for="walk-in-customer-name">Tên khách</label><input id="walk-in-customer-name" name="customerName" type="text" placeholder="Không bắt buộc" maxlength="80" value="${esc(walkInDefault.customerName||'')}"></div><div class="field full"><label>Bàn khách sử dụng *</label><div class="table-pick-groups">${tables}</div><div class="note" id="walk-in-picked">${picked.size?`Đã chọn: ${[...picked].join(' + ')}`:'Chọn ít nhất một bàn'}</div>${activeTableNote}</div></form></div>`;
      const saveLabel=existing?'Lưu thay đổi':'Bắt đầu phục vụ';
      const deleteAction=existing?`<button class="btn danger small" data-action="delete-walk-in-edit">${ico('trash')} Xóa khách lẻ</button>`:'';
      modal(existing?'Chỉnh sửa khách lẻ':'Ghi nhận khách lẻ',existing?`${esc(existing.customerName||'Khách lẻ')} · ${existing.guests} khách`:'Lượt phục vụ này được lưu riêng, không tính vào booking',body,`${deleteAction}<button class="btn" data-action="close-modal">Hủy</button><span class="spacer"></span><button class="btn primary" data-action="save-walk-in">${ico('check')} ${saveLabel}</button>`,true);
      groupWalkInPicker();
      document.querySelector('[data-action="delete-walk-in-edit"]')?.addEventListener('click',()=>deleteWalkIn(existing.id));
      document.querySelectorAll('[data-walk-in-table]').forEach(button=>button.addEventListener('click',()=>{
        const tableId=button.dataset.walkInTable;
        if(picked.has(tableId))picked.delete(tableId);else picked.add(tableId);
        button.classList.toggle('selected',picked.has(tableId));
        const overlap=[...picked].some(id=>state.walkIns.some(walkIn=>walkIn.id!==existing?.id&&walkIn.date===state.date&&walkIn.status==='arrived'&&walkIn.tableIds.includes(id)));
        const noteEl=document.querySelector('#walk-in-form .note[style*="color:var(--warning)"]');
        if(noteEl){noteEl.remove();}
        const selectedText=picked.size?`Đã chọn: ${[...picked].join(' + ')}`:'Chọn ít nhất một bàn';
        document.getElementById('walk-in-picked').textContent=selectedText;
        if(overlap){
          const note=document.createElement('div');note.className='note';note.style.color='var(--warning)';note.style.marginTop='8px';note.textContent='Bàn đang có lượt khách lẻ đang phục vụ. Hệ thống sẽ ghi nhận lượt mới thay vì gộp vào lượt cũ.';
          document.getElementById('walk-in-picked').insertAdjacentElement('afterend',note);
        }
      }));
      document.querySelector('[data-action="save-walk-in"]').addEventListener('click',saveWalkIn);
    }

    function saveWalkIn(){
      const form=document.getElementById('walk-in-form');if(!form.reportValidity())return;
      if(!state.modal.picked.size){toast('Chọn ít nhất một bàn cho khách lẻ');return}
      const data=Object.fromEntries(new FormData(form)),tableIds=[...state.modal.picked];
      const customerName=(data.customerName||'').trim();
      const isEditing=!!state.modal.id;
      const currentWalkIn=isEditing?state.walkIns.find(item=>item.id===state.modal.id):null;
      const walkInDate=currentWalkIn?data.date:state.date;
      const arrivalTime=currentWalkIn?.time || `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
      const bookingConflicts=state.bookings.filter(booking=>booking.date===walkInDate&&booking.tableIds.some(tableId=>tableIds.includes(tableId))&&!['cancelled','completed','no-show'].includes(booking.status));
      const walkInConflicts=state.walkIns.filter(walkIn=>walkIn.id!==currentWalkIn?.id&&walkIn.date===walkInDate&&walkIn.status==='arrived'&&walkIn.tableIds.some(tableId=>tableIds.includes(tableId)));
      const conflicts=[...bookingConflicts.map(booking=>({kind:'Booking',name:booking.name,time:booking.time,tableIds:booking.tableIds})),...walkInConflicts.map(walkIn=>({kind:'Khách lẻ',name:walkIn.customerName||'Khách lẻ',time:walkIn.time,tableIds:walkIn.tableIds}))];
      if(state.conflictWarning&&conflicts.length&&!state.modal.conflictConfirmed){
        showTableConflictConfirmation(walkInDate,arrivalTime,tableIds,conflicts,'Vẫn ghi nhận khách lẻ',()=>{state.modal.conflictConfirmed=true;saveWalkIn()});
        return;
      }
      if(isEditing && currentWalkIn){
        currentWalkIn.customerName=customerName;
        currentWalkIn.guests=Math.max(1,+data.guests||1);
        currentWalkIn.date=walkInDate;
        currentWalkIn.tableIds=[...new Set(tableIds)];
        currentWalkIn.time=arrivalTime;
        currentWalkIn.staffName=getCurrentUser()?.email||state.role;
        state.date=currentWalkIn.date;
        audit('Chỉnh sửa khách lẻ',`${currentWalkIn.customerName||'Khách lẻ'} · ${currentWalkIn.guests} khách · bàn ${currentWalkIn.tableIds.join(' + ')}`);
        save();closeModal();render();toast('Đã cập nhật khách lẻ');
        return;
      }
      const extraGuests=Math.max(1,+data.guests||1);
      const walkIn={id:crypto.randomUUID(),date:walkInDate,time:arrivalTime,tableIds,customerName,guests:extraGuests,status:'arrived',checkIn:new Date().toISOString(),completedAt:null,staffName:getCurrentUser()?.email||state.role};
      state.walkIns.push(walkIn);state.date=walkIn.date;audit('Ghi nhận khách lẻ',`${walkIn.customerName||'Khách lẻ'} · ${walkIn.guests} khách · bàn ${tableIds.join(' + ')} · ${walkIn.date}`);save();closeModal();render();toast(`Đã ghi nhận ${walkIn.guests} khách lẻ`);
    }

    function cancelWalkIn(id){
      const walkIn=state.walkIns.find(item=>item.id===id);if(!walkIn||walkIn.status!=='arrived')return;
      showConfirmation({title:'Hủy lượt khách lẻ?',message:'Bàn sẽ được giải phóng và lượt phục vụ sẽ dừng hoạt động.',confirmLabel:'Hủy lượt',iconName:'close',details:[{label:'Khách',value:`${walkIn.customerName||'Khách lẻ'} · ${walkIn.guests} khách`},{label:'Bàn',value:walkIn.tableIds.join(' + ')},{label:'Ngày',value:walkIn.date}],onConfirm:()=>{walkIn.status='cancelled';walkIn.completedAt=new Date().toISOString();audit('Hủy khách lẻ',`${walkIn.customerName||'Khách lẻ'} · ${walkIn.guests} khách · bàn ${walkIn.tableIds.join(' + ')}`);save();closeModal();render();openWalkInDetail(id);toast('Đã hủy lượt khách lẻ')}})
    }

    function completeWalkIn(id){
      const walkIn=state.walkIns.find(item=>item.id===id);if(!walkIn||walkIn.status!=='arrived')return;
      showConfirmation({title:'Hoàn tất lượt khách lẻ?',message:'Bàn sẽ được giải phóng và lượt phục vụ vẫn được giữ trong báo cáo.',confirmLabel:'Hoàn tất',iconName:'check',tone:'success',details:[{label:'Khách',value:`${walkIn.customerName||'Khách lẻ'} · ${walkIn.guests} khách`},{label:'Bàn',value:walkIn.tableIds.join(' + ')},{label:'Ngày',value:walkIn.date}],onConfirm:async()=>{
        const completedAt=new Date().toISOString();
        try{
          const updated=await updateSharedCompletion('walk_ins',walkIn.id,completedAt);
          if(!updated){await loadSharedData();closeModal();render();toast('Lượt khách đã được cập nhật ở thiết bị khác');return}
          walkIn.status='completed';walkIn.completedAt=completedAt;baselineWalkIns.set(walkIn.id,walkInToRow(walkIn));
          audit('Hoàn tất khách lẻ',`${walkIn.customerName||'Khách lẻ'} · ${walkIn.guests} khách · bàn ${walkIn.tableIds.join(' + ')}`);closeModal();render();toast('Đã hoàn tất lượt khách lẻ');
        }catch(error){console.error(error);toast('Không lưu được trạng thái hoàn tất. Kiểm tra kết nối rồi thử lại.')}
      }})
    }

    function openWalkInDetail(id){
      const walkIn=state.walkIns.find(item=>item.id===id);if(!walkIn)return;
      const name=walkInDisplayName(walkIn);
      const isActive=walkIn.status==='arrived';
      const isCancelled=walkIn.status==='cancelled';
      const statusMarkup=isActive?'<span class="status arrived">Đang ngồi</span>':isCancelled?'<span class="status cancelled">Đã hủy</span>':'<span class="status completed">Đã hoàn tất</span>';
      const elapsedMarkup=isActive?`<div class="detail-line"><span>Đã sử dụng</span><strong class="elapsed" data-elapsed="${esc(walkIn.checkIn||new Date().toISOString())}"></strong></div>`:`<div class="detail-line"><span>${isCancelled?'Đã hủy lúc':'Hoàn tất lúc'}</span><strong>${walkIn.completedAt?new Date(walkIn.completedAt).toLocaleString('vi-VN'):new Date().toLocaleString('vi-VN')}</strong></div>`;
      const footer=isActive?`<button class="btn" data-action="close-modal">Đóng</button><span class="spacer"></span><button class="btn" data-action="edit-walk-in-detail">${ico('edit')} Chỉnh sửa</button><button class="btn danger small" data-action="cancel-walk-in-detail">${ico('close')} Hủy bàn</button><button class="btn danger small" data-action="delete-walk-in-detail">${ico('trash')} Xóa</button><button class="btn primary" data-action="complete-walk-in-detail">${ico('check')} Hoàn tất</button>`:`<button class="btn" data-action="close-modal">Đóng</button><span class="spacer"></span><button class="btn" data-action="edit-walk-in-detail">${ico('edit')} Chỉnh sửa</button><button class="btn danger small" data-action="delete-walk-in-detail">${ico('trash')} Xóa</button>`;
      modal(esc(name),`${dateLabel(walkIn.date)} · ${walkInDisplayCount(walkIn)}`, `<div class="detail-line"><span>Bàn</span><strong>${walkIn.tableIds.map(esc).join(' + ')}</strong></div><div class="detail-line"><span>Trạng thái</span>${statusMarkup}</div><div class="detail-line"><span>Giờ vào</span><strong>${walkIn.checkIn?new Date(walkIn.checkIn).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):walkIn.time}</strong></div>${elapsedMarkup}` ,footer,true);
      document.querySelector('[data-action="edit-walk-in-detail"]').addEventListener('click',()=>openWalkIn(walkIn.tableIds,id));
      if(isActive){
        document.querySelector('[data-action="cancel-walk-in-detail"]').addEventListener('click',()=>cancelWalkIn(id));
        document.querySelector('[data-action="complete-walk-in-detail"]').addEventListener('click',()=>completeWalkIn(id));
      }
      document.querySelector('[data-action="delete-walk-in-detail"]').addEventListener('click',()=>deleteWalkIn(id));
    }

    function walkInHistory(){
      const rows=state.walkIns.filter(walkIn=>dateInRange(walkIn.date)).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));
      const renderRows=items=>items.map(walkIn=>`<div class="booking-row" data-walk-in-id="${walkIn.id}"><div class="time-mark">${walkIn.time}</div><div class="booking-info"><strong>${esc(walkIn.customerName||'Khách lẻ')} · ${dateLabel(walkIn.date,{day:'numeric',month:'short',year:'numeric'})} · Bàn ${walkIn.tableIds.map(esc).join(' + ')}</strong><small>${walkIn.guests} khách · ${walkIn.status==='arrived'?'Đang sử dụng':'Đã hoàn tất'}</small></div>${statusTag(walkIn.status)}</div>`).join('');
      const searchMarkup='<label class="toolbar-search" style="width:100%;margin-bottom:10px">'+ico('search')+'<input data-walk-in-search placeholder="Tìm tên, ngày, giờ, bàn hoặc số khách" aria-label="Tìm lịch sử khách lẻ"></label>';
      const listMarkup=renderRows(rows)||'<div class="empty-state">Chưa có lịch sử khách lẻ trong khoảng ngày này.</div>';
      modal('Lịch sử · Khách lẻ',`${rows.length} lượt khách lẻ trong khoảng ngày`,`${searchMarkup}<div data-walk-in-results>${listMarkup}</div>`,'<button class="btn" data-action="close-modal">Đóng</button>',true);
      const results=document.querySelector('[data-walk-in-results]');
      const bindRows=()=>results.querySelectorAll('[data-walk-in-id]').forEach(row=>row.addEventListener('click',()=>openWalkInDetail(row.dataset.walkInId)));
      bindRows();
      document.querySelector('[data-walk-in-search]').addEventListener('input',event=>{
        const query=event.target.value.trim().toLocaleLowerCase('vi');
        const filtered=rows.filter(walkIn=>`${walkIn.customerName||'Khách lẻ'} ${walkIn.date} ${dateLabel(walkIn.date,{day:'numeric',month:'short',year:'numeric'})} ${walkIn.time} ${walkIn.tableIds.join(' ')} ${walkIn.guests}`.toLocaleLowerCase('vi').includes(query));
        results.innerHTML=renderRows(filtered)||'<div class="empty-state">Không tìm thấy lượt khách phù hợp.</div>';
        bindRows();
      });
    }
  return {
    deleteWalkIn,
    groupWalkInPicker,
    openWalkIn,
    saveWalkIn,
    cancelWalkIn,
    completeWalkIn,
    openWalkInDetail,
    walkInHistory
  };
}
