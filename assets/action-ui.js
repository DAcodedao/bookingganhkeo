export function createUiActions(context) {
  const {
    supabase,
    ico,
    today,
    floors,
    tableMeta,
    logicalTableCount,
    floorUnit,
    inventorySummary,
    state,
    loadSharedData,
    save,
    esc,
    walkInDisplayName,
    navItems,
    navButton,
    overview,
    visibleFloorTableIds,
    render,
    modal,
    openBooking,
    showConfirmation,
    showDeletePasswordConfirmation,
    checkIn,
    completeBooking,
    cancelBooking,
    cancelWalkIn,
    completeWalkIn,
    openWalkInDetail
  } = context;
    function bindResetDataConfirmation(){
      if(!state.canManageData)return;
      const button=document.querySelector('[data-action="reset-data"]');if(!button)return;
      button.addEventListener('click',event=>{
        event.preventDefault();event.stopImmediatePropagation();
        showDeletePasswordConfirmation(()=>{
          loadSharedData().then(()=>{closeModal();render();toast('Đã xóa dữ liệu dùng chung')}).catch(error=>toast(error.message||'Đã xóa dữ liệu nhưng không tải lại được.'));
        });
      },true)
    }

    function addDeletePasswordSetting(){
      if(state.page!=='settings'||!state.canManageData)return;
      const panel=[...document.querySelectorAll('.settings-grid>.panel')].find(item=>item.querySelector('.panel-title')?.textContent.includes('Nhân sự & dữ liệu'));
      const body=panel?.querySelector('.panel-body');
      if(!body||body.querySelector('[data-action="change-delete-password"]'))return;
      const row=document.createElement('div');row.className='setting-row';
      row.innerHTML='<div><strong>Mật khẩu xoá dữ liệu</strong><small>Đặt hoặc đổi mật khẩu dùng để xác nhận xoá toàn bộ</small></div><button type="button" class="btn small" data-action="change-delete-password">Đặt / đổi mật khẩu</button>';
      body.append(row);
      row.querySelector('button').addEventListener('click',openDeletePasswordSettings);
    }

    function updateUnitLabels(){
      if(state.page==='overview'){
        const panel=[...document.querySelectorAll('.grid-main .panel')].find(item=>item.querySelector('.panel-title')?.textContent==='Tình trạng các tầng');
        const note=panel?.querySelector('.panel-note');
        if(note)note.textContent=`${inventorySummary()} · không giới hạn lượt đặt theo ngày`;
      }
      if(state.page==='map'){
        const floor=floors.find(item=>item.id===state.floor);
        if(floor){
          const unit=floorUnit(floor);
          const description=document.querySelector('#content .page-sub');
          if(description)description.textContent=`${inventorySummary()} · chạm bàn/phòng để xem các lượt đặt trong ngày`;
          document.querySelectorAll('.floor-tabs [data-floor]').forEach(button=>{
            const tabFloor=floors.find(item=>item.id===button.dataset.floor);
            const count=button.querySelector('span');
            if(tabFloor&&count)count.textContent=`${logicalTableCount(tabFloor)} ${floorUnit(tabFloor)}`;
          });
          const floorCount=document.querySelector('.floor-section-head span');
          if(floorCount)floorCount.textContent=`${visibleFloorTableIds(floor).length} ${unit} · kéo booking sang bàn/phòng để chuyển`;
          document.querySelectorAll('.zone-group').forEach(group=>{
            const count=group.querySelector('.zone-group-count');
            if(count)count.textContent=`${group.querySelectorAll('.table-card').length} ${unit}`;
          });
          document.querySelectorAll('.merged-mark').forEach(mark=>{
            const group=state.groups.find(ids=>ids.includes(mark.closest('.table-card')?.dataset.table));
            if(group)mark.textContent=`GHÉP ${group.length} VỊ TRÍ`;
          });
          const mergeNote=document.querySelector('.map-toolbar .note');
          if(mergeNote)mergeNote.textContent='Chọn ít nhất 2 bàn/phòng rồi xác nhận ghép.';
        }
        document.querySelectorAll('[data-add-booking]').forEach(button=>{
          const meta=tableMeta(button.dataset.addBooking);
          const floor=meta&&floors.find(item=>item.name===meta.floor);
          const unit=floorUnit(floor);
          button.title=`Thêm booking ${unit} ${button.dataset.addBooking}`;
          button.setAttribute('aria-label',button.title);
        });
      }
      document.querySelectorAll('#content th').forEach(header=>{
        if(header.textContent.trim()==='Bàn')header.textContent='Bàn / phòng';
      });
      if(state.page==='settings'){
        const panel=[...document.querySelectorAll('.settings-grid>.panel')].find(item=>item.querySelector('.panel-title')?.textContent.includes('Danh sách bàn'));
        const body=panel?.querySelector('.panel-body');
        if(panel&&body){
          panel.querySelector('.panel-title').textContent='Danh sách bàn & phòng';
          body.innerHTML=floors.map(floor=>`<div class="detail-line"><span>${floor.name}</span><strong>${floor.tables[0]} – ${floor.tables[floor.tables.length-1]} · ${floor.tables.length} ${floorUnit(floor)}</strong></div>`).join('');
        }
      }
    }

    function openDeletePasswordSettings(){
      modal('Đặt / đổi mật khẩu xoá dữ liệu','Mật khẩu được lưu an toàn trong Supabase dưới dạng mã hoá',`<div class="form-grid"><div class="field full"><label for="delete-current-password">Mật khẩu hiện tại</label><input id="delete-current-password" type="password" autocomplete="current-password" placeholder="Để trống nếu thiết lập lần đầu"></div><div class="field"><label for="delete-new-password">Mật khẩu mới</label><input id="delete-new-password" type="password" autocomplete="new-password" minlength="8" placeholder="Ít nhất 8 ký tự"></div><div class="field"><label for="delete-confirm-password">Nhập lại mật khẩu mới</label><input id="delete-confirm-password" type="password" autocomplete="new-password" minlength="8" placeholder="Nhập lại mật khẩu mới"></div></div>`,`<button type="button" class="btn" data-action="close-modal">Hủy</button><span class="spacer"></span><button type="button" class="btn primary" data-action="save-delete-password">Lưu mật khẩu</button>`,true);
      document.querySelector('[data-action="save-delete-password"]')?.addEventListener('click',async()=>{
        const currentPassword=document.getElementById('delete-current-password').value;
        const newPassword=document.getElementById('delete-new-password').value;
        const confirmation=document.getElementById('delete-confirm-password').value;
        if(newPassword.length<8){toast('Mật khẩu mới cần có ít nhất 8 ký tự');return}
        if(newPassword!==confirmation){toast('Mật khẩu nhập lại không khớp');return}
        const button=document.querySelector('[data-action="save-delete-password"]');button.disabled=true;
        try{
          const {error}=await supabase.rpc('set_delete_password',{p_current_password:currentPassword||null,p_new_password:newPassword});
          if(error)throw error;
          closeModal();toast('Đã lưu mật khẩu xoá dữ liệu trên Supabase');
        }catch(error){button.disabled=false;toast(error.message||'Không đổi được mật khẩu')}
      });
    }

    function clearHistory(){
      if(!state.canManageData)return;
      if(!state.history.length){toast('Chưa có lịch sử nào để xóa');return}
      showConfirmation({title:'Xóa toàn bộ lịch sử thao tác?',message:'Hành động này sẽ xóa tất cả ghi nhận lịch sử trên thiết bị và không thể hoàn tác.',confirmLabel:'Xóa lịch sử',iconName:'trash',details:[{label:'Số dòng',value:`${state.history.length} hoạt động`}],onConfirm:()=>{state.history=[];save();render();toast('Đã xóa lịch sử thao tác')}})
    }

    function addMobileSettingsLink(){const nav=document.querySelector('.mobile-nav');if(nav&&!nav.querySelector('[data-page="settings"]'))nav.insertAdjacentHTML('beforeend',navButton(navItems.find(item=>item[0]==='settings')))}

    function bindOverviewActions(){
      if(state.page!=='overview')return;
      document.querySelectorAll('.today-list [data-active-session]').forEach(input=>input.addEventListener('click',event=>event.stopPropagation()));
      document.querySelectorAll('.today-list .booking-row[data-booking]').forEach(row=>{
        const booking=state.bookings.find(item=>item.id===row.dataset.booking);
        if(!booking)return;
        row.classList.add('overview-booking-row');
        const actions=document.createElement('div');
        actions.className='overview-actions';
        const addAction=(label,className,iconName,handler)=>{
          const button=document.createElement('button');
          button.type='button';
          button.className=`btn ${className} small`;
          button.innerHTML=`${ico(iconName)} ${label}`;
          button.setAttribute('aria-label',`${label} ${booking.name}`);
          button.addEventListener('click',event=>{event.stopPropagation();handler(booking.id)});
          actions.append(button);
        };
        if(booking.status==='confirmed'){
          addAction('Check-in','soft','check',checkIn);
        }else if(booking.status==='arrived'){
          addAction('Hoàn tất','primary','check',completeBooking);
        }
        if(['confirmed','arrived'].includes(booking.status))addAction('Hủy','danger','close',cancelBooking);
        if(actions.childElementCount)row.append(actions);
      });
      document.querySelectorAll('.today-list .booking-row[data-walk-in]').forEach(row=>{
        const walkIn=state.walkIns.find(item=>item.id===row.dataset.walkIn);
        if(!walkIn)return;
        row.classList.add('overview-booking-row');
        row.addEventListener('click',event=>{
          if(event.target.closest('button,input'))return;
          openWalkInDetail(row.dataset.walkIn);
        });
        if(walkIn.status==='arrived'){
          const actions=document.createElement('div');
          actions.className='overview-actions';
          const addAction=(label,className,iconName,handler)=>{
            const button=document.createElement('button');
            button.type='button';
            button.className=`btn ${className} small`;
            button.innerHTML=`${ico(iconName)} ${label}`;
            button.setAttribute('aria-label',`${label} ${walkInDisplayName(walkIn)}`);
            button.addEventListener('click',event=>{event.stopPropagation();handler(walkIn.id)});
            actions.append(button);
          };
          addAction('Hoàn tất','primary','check',completeWalkIn);
          addAction('Hủy','danger','close',cancelWalkIn);
          row.append(actions);
        }
      });
    }

    function bindTableAddButtons(){document.querySelectorAll('[data-add-booking]').forEach(button=>button.addEventListener('click',e=>{e.stopPropagation();openBooking(null,[button.dataset.addBooking])}))}

    function enableTimeDrag(){if(state.page!=='bookings')return;document.querySelectorAll('.data-table tbody tr[data-booking]').forEach(row=>{row.draggable=true;row.dataset.dropTime=row.querySelector('td')?.textContent.trim();row.addEventListener('dragstart',e=>e.dataTransfer.setData('text/booking',row.dataset.booking));row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('text/booking'),booking=state.bookings.find(b=>b.id===id),time=row.dataset.dropTime;if(!booking||!time||booking.time===time)return;const conflicts=state.bookings.filter(b=>b.id!==id&&b.date===booking.date&&b.time===time&&b.tableIds.some(t=>booking.tableIds.includes(t))&&!['cancelled','completed','no-show'].includes(b.status));if(conflicts.length){toast(`Không thể đổi giờ: bàn đã có booking lúc ${time}`);return}const oldTime=booking.time;booking.time=time;audit('Đổi giờ bằng kéo thả',`${booking.name} · ${oldTime} → ${time}`);save();render();toast(`Đã đổi giờ ${booking.name} sang ${time}`)})})}

    function audit(action,subject){state.history.push({at:new Date().toISOString(),by:state.role,action,subject});save()}

    function toast(text){const root=document.getElementById('toast-root');root.innerHTML=`<div class="toast">${esc(text)}</div>`;setTimeout(()=>{root.innerHTML=''},2600)}

    function closeModal(){state.modal=null;document.getElementById('modal-root').innerHTML=''}

    function toggleTheme(){state.theme=state.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=state.theme;localStorage.setItem('gk-theme',state.theme);render()}

    function updateElapsed(){document.querySelectorAll('[data-elapsed]').forEach(el=>{const seconds=Math.max(0,Math.floor((Date.now()-new Date(el.dataset.elapsed).getTime())/1000));const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;el.textContent=`${h?`${h} giờ `:''}${String(m).padStart(2,'0')} phút ${String(s).padStart(2,'0')} giây`})}
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
    document.addEventListener('toggle',event=>{
      const target=event.target;
      if(target.matches?.('[data-customer-group]')){
        if(target.dataset.customerGroup in state.customerVenueOpen)state.customerVenueOpen[target.dataset.customerGroup]=target.open;
        return;
      }
      if(target.matches?.('[data-customer-flow]')&&target.dataset.customerFlow in state.customerFlowOpen)state.customerFlowOpen[target.dataset.customerFlow]=target.open;
      if(target.matches?.('[data-booking-venue]'))state.bookingVenueOpen[target.dataset.bookingVenue]=target.open;
      if(target.matches?.('[data-report-venue]'))state.reportVenueOpen[target.dataset.reportVenue]=target.open;
      if(target.matches?.('[data-report-flow]'))state.reportFlowOpen[target.dataset.reportFlow]=target.open;
    },true);
  return {
    bindResetDataConfirmation,
    addDeletePasswordSetting,
    updateUnitLabels,
    openDeletePasswordSettings,
    clearHistory,
    addMobileSettingsLink,
    bindOverviewActions,
    bindTableAddButtons,
    enableTimeDrag,
    audit,
    toast,
    closeModal,
    toggleTheme,
    updateElapsed
  };
}
