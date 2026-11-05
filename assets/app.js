import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createActions } from './actions.js';
import { allTables, childIds, childIdsOfTable, floorTableIds, floorTables, floorUnit, floors, icon, ico, inventorySummary, isVipRecord, logicalTableCount, normalizeBookingStatus, normalizeTableId, normalizeWalkInStatus, recordBelongsToVenue, splitCountOfTable, statusNames, SUB_TABLE_SUFFIX, tableMeta, today, vipTableIds } from './catalog.js';
import { createViews } from './views.js';

    const supabase=createClient('https://irmsitqklnqrcqajtqwr.supabase.co','sb_publishable_JEQwtU5dUutr4OzkG3-ASQ_DE2VRQfF');
    let currentUser=null;
    let sharedDataChannel=null;
    let realtimeRefreshTimer=null;
    let syncStatus='loading';
    let persistenceQueue=Promise.resolve();
    let persistenceBusy=false;
    let baselineBookings=new Map();
    let baselineWalkIns=new Map();
    let baselineHistory=new Map();
    let baselineGroups=new Map();
    const groupIdByKey=new Map();
    const syncStatusLabels={loading:'Đang tải dữ liệu',saving:'Đang lưu...',syncing:'Đang đồng bộ...',synced:'Đã đồng bộ',error:'Lỗi đồng bộ'};
    function setSyncStatus(status){
      syncStatus=status;
      const chip=document.querySelector('.demo-chip');
      if(!chip)return;
      const label=syncStatusLabels[status]||syncStatusLabels.error;
      chip.dataset.syncState=status;
      chip.title=label;
      chip.setAttribute('aria-label',label);
      let labelNode=chip.querySelector('[data-sync-label]');
      if(!labelNode){chip.innerHTML='<span class="sync-dot" aria-hidden="true"></span><span data-sync-label></span>';labelNode=chip.querySelector('[data-sync-label]')}
      labelNode.textContent=label;
    }
    const bookingDisplayStatus=booking=>bookingIsOverdue(booking)?'overdue':normalizeBookingStatus(booking.status);
    function bookingIsOverdue(booking){
      if(!booking||normalizeBookingStatus(booking.status)!=='confirmed')return false;
      if(booking.date!==state.date)return false;
      if(!booking.time)return false;
      const now=new Date();
      const [hour,minute]=String(booking.time).split(':').map(Number);
      const due=new Date(`${booking.date}T${String(hour||0).padStart(2,'0')}:${String(minute||0).padStart(2,'0')}:00`);
      return due < now;
    }
    function overdueBookings(){
      return state.bookings.filter(booking=>bookingIsOverdue(booking));
    }
    const demoBookings=()=>{const d=today();return [{id:'demo1',name:'Nguyễn Minh Anh',phone:'0903 218 416',guests:4,date:d,time:'12:00',tableIds:['T01'],deposit:500000,note:'Khách lẻ · thích ngồi gần cửa sổ',status:'deposit',created:new Date().toISOString()},{id:'demo2',name:'Trần Quốc Bảo',phone:'0918 764 220',guests:6,date:d,time:'18:30',tableIds:['L101','L102'],deposit:1000000,note:'Sinh nhật, chuẩn bị bánh nhỏ',status:'confirmed',created:new Date().toISOString()},{id:'demo3',name:'Lê Thu Hà',phone:'0987 331 506',guests:2,date:d,time:'19:00',tableIds:['ST01'],deposit:0,note:'',status:'arrived',checkIn:new Date(Date.now()-24*60000).toISOString(),created:new Date().toISOString()},{id:'demo4',name:'Phạm Gia Huy',phone:'0935 602 147',guests:3,date:d,time:'20:00',tableIds:['L204'],deposit:300000,note:'Bên trong góc, khách quen',status:'confirmed',created:new Date().toISOString()},{id:'demo5',name:'Võ Ngọc Lan',phone:'0908 195 477',guests:5,date:d,time:'20:30',tableIds:['ST08'],deposit:500000,note:'',status:'deposit',created:new Date().toISOString()}]};
    const load=(key,fallback)=>{try{const x=localStorage.getItem(key);return x?JSON.parse(x):fallback}catch{return fallback}};
    const state={page:'overview',date:today(),dateFrom:today(),dateTo:today(),floor:'ground',theme:localStorage.getItem('gk-theme')||'light',bookings:[],walkIns:[],history:[],groups:[],role:'Nhân viên',canManageData:false,modal:null,search:'',statusFilter:'all',reportMode:'month',mergeMode:false,selectedTables:[],selectedActiveSessions:[],activeSessionsOpen:false,customerSearch:'',walkInSearch:'',customerVenueOpen:{gk2:false,vip3:false},customerFlowOpen:{gk2Booking:false,gk2WalkIn:false,vip3Booking:false,vip3WalkIn:false},bookingVenueOpen:{gk2:false,vip3:false},reportVenueOpen:{gk2:false,vip3:false},reportFlowOpen:{gk2Booking:false,gk2WalkIn:false,vip3Booking:false,vip3WalkIn:false},month:today().slice(0,7),overdueWarning:localStorage.getItem('gk-overdue-warning')!=='false'};
    document.documentElement.dataset.theme=state.theme;
    const groupKey=ids=>[...ids].sort().join('|');
    const dateInRange=(value)=>{
      if(!value) return false;
      const from = state.dateFrom || state.date;
      const to = state.dateTo || state.date;
      const target = new Date(value + 'T00:00:00');
      const start = new Date(from + 'T00:00:00');
      const end = new Date(to + 'T00:00:00');
      return target >= start && target <= end;
    };
    const dateRangeText=()=>{
      if(state.dateFrom===state.dateTo) return dateLabel(state.dateFrom,{day:'numeric',month:'long',year:'numeric'});
      return `${dateLabel(state.dateFrom,{day:'numeric',month:'short'})} → ${dateLabel(state.dateTo,{day:'numeric',month:'short',year:'numeric'})}`;
    };
    function setOverviewDate(date){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
      state.date=date;
      state.dateFrom=date;
      state.dateTo=date;
      render();
    }
    function shiftOverviewDate(days){
      const [year,month,day]=state.date.split('-').map(Number);
      const shifted=new Date(Date.UTC(year,month-1,day+days));
      setOverviewDate(`${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth()+1).padStart(2,'0')}-${String(shifted.getUTCDate()).padStart(2,'0')}`);
    }
    const bookingToRow=b=>({id:b.id,name:b.name,phone:b.phone,guests:b.guests,date:b.date,time:b.time,table_ids:b.tableIds,deposit:b.deposit,note:b.note,status:normalizeBookingStatus(b.status),check_in:b.checkIn||null,completed_at:b.completedAt||null,cancelled_at:b.cancelledAt||null,created:b.created});
    const bookingFromRow=b=>({id:b.id,name:b.name,phone:b.phone,guests:b.guests,date:b.date,time:b.time,tableIds:(b.table_ids||[]).map(normalizeTableId),deposit:Number(b.deposit)||0,note:b.note||'',status:normalizeBookingStatus(b.status),checkIn:b.check_in,completedAt:b.completed_at,cancelledAt:b.cancelled_at,created:b.created});
    const walkInToRow=walkIn=>({id:walkIn.id,customer_name:walkIn.customerName||'',date:walkIn.date,time:walkIn.time,table_ids:walkIn.tableIds,guests:walkIn.guests,status:normalizeWalkInStatus(walkIn.status),check_in:walkIn.checkIn,completed_at:walkIn.completedAt||null,staff_name:walkIn.staffName});
    const walkInFromRow=row=>({id:row.id,customerName:row.customer_name||'',date:row.date,time:row.time,tableIds:(row.table_ids||[]).map(normalizeTableId),guests:Number(row.guests)||0,status:normalizeWalkInStatus(row.status),checkIn:row.check_in,completedAt:row.completed_at,staffName:row.staff_name});
    async function loadSharedData(){
      const results=await Promise.all([supabase.from('bookings').select('*'),supabase.from('walk_ins').select('*'),supabase.from('booking_history').select('*').order('id'),supabase.from('table_groups').select('*')]);
      const failed=results.find(result=>result.error);if(failed)throw failed.error;
      const [bookingResult,walkInResult,historyResult,groupResult]=results.map(result=>result.data);
      const bookings=bookingResult,walkIns=walkInResult,history=historyResult,groups=groupResult.map(row=>({...row,table_ids:(row.table_ids||[]).map(normalizeTableId)}));
      state.bookings=bookings.map(bookingFromRow);
      state.walkIns=walkIns.map(walkInFromRow);
      state.history=history.map(row=>({id:row.id,at:row.occurred_at,by:row.staff_name,action:row.action,subject:row.subject}));
      state.groups=groups.map(row=>row.table_ids||[]);
      state.canManageData=true;
      state.role='Quản lý';
      baselineBookings=new Map(state.bookings.map(booking=>{const row=bookingToRow(booking);return[row.id,row]}));
      baselineWalkIns=new Map(state.walkIns.map(walkIn=>[walkIn.id,walkInToRow(walkIn)]));
      baselineHistory=new Map(history.map(row=>[row.id,row]));
      baselineGroups=new Map(groups.map(row=>[row.id,row]));
      groupIdByKey.clear();groups.forEach(row=>groupIdByKey.set(groupKey(row.table_ids||[]),row.id));
    }
    async function persistSharedData(){
      const nextBookings=new Map(state.bookings.map(booking=>{const row=bookingToRow(booking);return[row.id,row]}));
      const removedBookings=[...baselineBookings.keys()].filter(id=>!nextBookings.has(id));
      const changedBookings=[...nextBookings.values()].filter(row=>JSON.stringify(row)!==JSON.stringify(baselineBookings.get(row.id)));
      if(removedBookings.length){const {error}=await supabase.from('bookings').delete().in('id',removedBookings);if(error)throw error}
      if(changedBookings.length){const {error}=await supabase.from('bookings').upsert(changedBookings);if(error)throw error}
      baselineBookings=nextBookings;

      const nextWalkIns=new Map(state.walkIns.map(walkIn=>{const row=walkInToRow(walkIn);return[row.id,row]}));
      const removedWalkIns=[...baselineWalkIns.keys()].filter(id=>!nextWalkIns.has(id));
      const changedWalkIns=[...nextWalkIns.values()].filter(row=>JSON.stringify(row)!==JSON.stringify(baselineWalkIns.get(row.id)));
      if(removedWalkIns.length){const {error}=await supabase.from('walk_ins').delete().in('id',removedWalkIns);if(error)throw error}
      if(changedWalkIns.length){const {error}=await supabase.from('walk_ins').upsert(changedWalkIns);if(error)throw error}
      baselineWalkIns=nextWalkIns;

      const nextHistory=new Map(state.history.filter(row=>row.id!=null).map(row=>[row.id,{id:row.id,occurred_at:row.at,staff_name:row.by,action:row.action,subject:row.subject}]));
      const removedHistory=[...baselineHistory.keys()].filter(id=>!nextHistory.has(id));
      if(removedHistory.length){const {error}=await supabase.from('booking_history').delete().in('id',removedHistory);if(error)throw error}
      const pendingHistory=state.history.filter(row=>row.id==null);
      if(pendingHistory.length){
        const {data,error}=await supabase.from('booking_history').insert(pendingHistory.map(row=>({occurred_at:row.at,staff_name:row.by,action:row.action,subject:row.subject}))).select();
        if(error)throw error;
        data.forEach((row,index)=>{const local=pendingHistory[index];local.id=row.id;local.at=row.occurred_at;delete local.pendingId;nextHistory.set(row.id,row)});
      }
      baselineHistory=nextHistory;

      const nextGroups=new Map(state.groups.map(ids=>{const key=groupKey(ids);const id=groupIdByKey.get(key)||crypto.randomUUID();groupIdByKey.set(key,id);const row={id,table_ids:ids};return[id,row]}));
      const removedGroups=[...baselineGroups.keys()].filter(id=>!nextGroups.has(id));
      const changedGroups=[...nextGroups.values()].filter(row=>JSON.stringify(row)!==JSON.stringify(baselineGroups.get(row.id)));
      if(removedGroups.length){const {error}=await supabase.from('table_groups').delete().in('id',removedGroups);if(error)throw error}
      if(changedGroups.length){const {error}=await supabase.from('table_groups').upsert(changedGroups);if(error)throw error}
      baselineGroups=nextGroups;
    }
    async function updateSharedCompletion(table,id,completedAt){
      setSyncStatus('saving');
      const {data,error}=await supabase.from(table).update({status:'completed',completed_at:completedAt}).eq('id',id).eq('status','arrived').select('id').maybeSingle();
      if(error){setSyncStatus('error');throw error}
      setSyncStatus(data?'synced':'syncing');
      return Boolean(data);
    }
    const save=()=>{if(!currentUser)return;setSyncStatus('saving');persistenceQueue=persistenceQueue.then(async()=>{persistenceBusy=true;try{await persistSharedData();setSyncStatus('synced')}finally{persistenceBusy=false}}).catch(error=>{console.error(error);setSyncStatus('error');toast('Không lưu được dữ liệu chung. Kiểm tra kết nối rồi thử lại.')});return persistenceQueue};
    function hasUnsavedChanges(){
      const bookings=new Map(state.bookings.map(booking=>{const row=bookingToRow(booking);return[row.id,row]}));
      if(bookings.size!==baselineBookings.size||[...bookings].some(([id,row])=>JSON.stringify(row)!==JSON.stringify(baselineBookings.get(id))))return true;
      const walkIns=new Map(state.walkIns.map(walkIn=>{const row=walkInToRow(walkIn);return[row.id,row]}));
      if(walkIns.size!==baselineWalkIns.size||[...walkIns].some(([id,row])=>JSON.stringify(row)!==JSON.stringify(baselineWalkIns.get(id))))return true;
      const historyIds=new Set(state.history.filter(row=>row.id!=null).map(row=>row.id));
      if(state.history.some(row=>row.id==null)||historyIds.size!==baselineHistory.size||[...baselineHistory.keys()].some(id=>!historyIds.has(id)))return true;
      const groupIds=new Set(state.groups.map(ids=>groupIdByKey.get(groupKey(ids))).filter(Boolean));
      return groupIds.size!==baselineGroups.size||[...baselineGroups.keys()].some(id=>!groupIds.has(id));
    }
    async function refreshSharedData(){
      if(!currentUser||persistenceBusy||state.modal||hasUnsavedChanges())return;
      setSyncStatus('syncing');
      const activeInput=document.activeElement?.matches('[data-search],[data-customer-search],[data-date-from],[data-date-to]')?document.activeElement:null;
      const focusAttribute=activeInput?['data-search','data-customer-search','data-date-from','data-date-to'].find(attribute=>activeInput.hasAttribute(attribute)):null;
      const selectionStart=typeof activeInput?.selectionStart==='number'?activeInput.selectionStart:null;
      const before=JSON.stringify({bookings:state.bookings.map(bookingToRow),walkIns:state.walkIns.map(walkInToRow),history:state.history.map(({id,at,by,action,subject})=>({id,at,by,action,subject})),groups:state.groups.map(groupKey).sort()});
      try{await loadSharedData()}catch(error){setSyncStatus('error');console.warn('Shared data refresh failed',error);return}
      setSyncStatus('synced');
      const after=JSON.stringify({bookings:state.bookings.map(bookingToRow),walkIns:state.walkIns.map(walkInToRow),history:state.history.map(({id,at,by,action,subject})=>({id,at,by,action,subject})),groups:state.groups.map(groupKey).sort()});
      if(before!==after){
        render();
        const restoredInput=focusAttribute?document.querySelector(`[${focusAttribute}]`):null;
        restoredInput?.focus();
        if(selectionStart!==null)restoredInput?.setSelectionRange(selectionStart,selectionStart);
      }
    }
    function scheduleSharedDataRefresh(){
      clearTimeout(realtimeRefreshTimer);
      realtimeRefreshTimer=setTimeout(()=>void refreshSharedData(),150);
    }
    function unsubscribeFromSharedData(){
      clearTimeout(realtimeRefreshTimer);
      realtimeRefreshTimer=null;
      if(sharedDataChannel){void supabase.removeChannel(sharedDataChannel);sharedDataChannel=null}
    }
    function subscribeToSharedData(){
      unsubscribeFromSharedData();
      if(!currentUser)return;
      let channel=supabase.channel(`shared-data-${currentUser.id}`);
      ['bookings','walk_ins','booking_history','table_groups'].forEach(table=>{
        channel=channel.on('postgres_changes',{event:'*',schema:'public',table},scheduleSharedDataRefresh);
      });
      sharedDataChannel=channel.subscribe(status=>{
        if(status==='SUBSCRIBED'){if(!persistenceBusy)setSyncStatus('synced');return}
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){setSyncStatus('error');console.warn('Realtime sync unavailable',status)}
      });
    }
    function renderLogin(message=''){
      document.getElementById('app').innerHTML=`<main class="auth-screen"><section class="auth-story"><div class="auth-story-top"><div class="auth-brand-lockup"><img src="http://www.ganhkeone.com/thumbnail/192x192x1/upload/photo/thiet-ke-chua-co-ten-31-2291.png" alt=""><div><strong>Nhà Hàng Gánh Kèo</strong><small>BIÊN HÒA · ĐỒNG NAI</small></div></div><span class="auth-live">Trực tuyến</span></div><div class="auth-story-copy"><div class="auth-overline">Một ca phục vụ chỉn chu</div><p class="auth-statement">Giữ nhịp<br><em>cho từng bàn tiệc.</em></p><p>Từ lúc đón khách đến khi khép lại lượt phục vụ, mọi chi tiết đều ở đúng chỗ.</p><div class="auth-quote"><span>“Bàn đông, lòng vẫn thong dong.”</span><small>Gánh Kèo · Biên Hòa</small></div></div><div class="auth-story-foot"><span>BIÊN HÒA · ĐỒNG NAI</span><span>OPERATION DESK / 01</span></div></section><section class="auth-main"><form class="auth-panel" id="login-form"><div class="auth-form-heading"><span class="auth-form-kicker">Chào mừng trở lại</span><h1>Vào ca thôi.</h1><p>Đăng nhập để tiếp tục phiên làm việc.</p></div><label for="login-email">Email tài khoản</label><input id="login-email" name="email" type="email" autocomplete="username" placeholder="ten@ganhkeo.vn" required><label for="login-password">Mật khẩu</label><input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu" required><button class="btn primary" type="submit"><span>Đăng nhập vào hệ thống</span><span class="auth-submit-icon">${ico('arrow')}</span></button><div class="auth-footnote">Dữ liệu được đồng bộ trực tuyến</div><div class="auth-error" role="alert">${esc(message)}</div></form></section></main>`;
      document.getElementById('login-form').addEventListener('submit',async event=>{
        event.preventDefault();
        const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;button.textContent='Đang đăng nhập...';
        const {data,error}=await supabase.auth.signInWithPassword({email:form.elements.email.value,password:form.elements.password.value});
        if(error){renderLogin(error.message);return}
        await openAppSession(data.user);
      });
    }
    async function openAppSession(user){
      currentUser=user;
      document.getElementById('app').innerHTML='<main class="auth-screen">Đang tải dữ liệu dùng chung...</main>';
      try{
        await loadSharedData();
        render();
        setSyncStatus('synced');
        subscribeToSharedData();
      }catch(error){console.error(error);currentUser=null;renderLogin(`Không tải được dữ liệu Supabase: ${error.message}`)}
    }
    async function startApp(){
      supabase.auth.onAuthStateChange(event=>{
        if(event==='SIGNED_OUT'){unsubscribeFromSharedData();currentUser=null;state.bookings=[];state.walkIns=[];state.history=[];state.groups=[];renderLogin()}
      });
      const {data,error}=await supabase.auth.getSession();
      if(error){renderLogin(error.message);return}
      if(data.session)await openAppSession(data.session.user);else renderLogin();
    }
    async function signOut(){const {error}=await supabase.auth.signOut();if(error)toast('Không đăng xuất được. Vui lòng thử lại.')}
    const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function emphasizeTableReferences(root){
      if(!root)return;
      const textNodes=[],pattern=/\b(?:T\d{2}[A-D]?|L\d{3}|ST\d{2}|Kèo\s+\d+)\b/g,walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()){
        const node=walker.currentNode,parent=node.parentElement;
        if(!parent||parent.closest('script,style,textarea,input,select,option,.table-id,.table-tag,.table-pick,.slot,.table-ref,.bar-label,.customer-group-label'))continue;
        pattern.lastIndex=0;if(pattern.test(node.nodeValue))textNodes.push(node);
      }
      textNodes.forEach(node=>{
        const value=node.nodeValue,matcher=new RegExp(pattern.source,'g'),fragment=document.createDocumentFragment();let offset=0,match;
        while((match=matcher.exec(value))){fragment.append(document.createTextNode(value.slice(offset,match.index)));const isVenueName=match[0].startsWith('Kèo')&&value.slice(0,match.index).endsWith('Gánh ');if(isVenueName){fragment.append(document.createTextNode(match[0]));offset=matcher.lastIndex;continue}const badge=document.createElement('span');badge.className='table-ref';badge.textContent=match[0];fragment.append(badge);offset=matcher.lastIndex}
        fragment.append(document.createTextNode(value.slice(offset)));node.replaceWith(fragment);
      });
    }
    const tableReferenceObserver=new MutationObserver(records=>{
      const roots=new Set();
      records.forEach(record=>{
        if(record.type==='characterData'){if(record.target.parentElement)roots.add(record.target.parentElement);return}
        record.addedNodes.forEach(node=>{if(node.nodeType===Node.ELEMENT_NODE)roots.add(node);else if(node.nodeType===Node.TEXT_NODE&&node.parentElement)roots.add(node.parentElement)});
      });
      roots.forEach(root=>emphasizeTableReferences(root));
    });
    tableReferenceObserver.observe(document.body,{childList:true,characterData:true,subtree:true});
    const money=n=>new Intl.NumberFormat('vi-VN').format(Number(n)||0)+' ₫';
    const dateLabel=(d,opts={weekday:'long',day:'numeric',month:'long',year:'numeric'})=>new Intl.DateTimeFormat('vi-VN',opts).format(new Date(d+'T12:00:00'));
    const bookingTimeLabel=booking=>booking.time||'Chưa chọn giờ';
    const statusTag=s=>`<span class="status ${esc(s)}">${statusNames[s]||s}</span>`;
    const displayTables=b=>b.tableIds.map(t=>esc(t)).join(' + ');
    const walkInDisplayName=walkIn=>walkIn.customerName&&walkIn.customerName!=='Khách lẻ'?`Khách lẻ · ${walkIn.customerName}`:'Khách lẻ';
    const walkInDisplayCount=walkIn=>`${walkIn.guests} khách`;
    const dayBookings=()=>state.bookings.filter(b=>b.date===state.date&&b.status!=='cancelled'&&b.status!=='completed'&&b.status!=='no-show').sort((a,b)=>a.time.localeCompare(b.time));
    const bookingsForTable=(id)=>state.bookings.filter(b=>b.date===state.date&&b.tableIds.includes(id)&&!['cancelled','completed','no-show'].includes(b.status)).sort((a,b)=>a.time.localeCompare(b.time));
    const activeWalkInsForTable=(tableId)=>state.walkIns.filter(walkIn=>walkIn.date===state.date&&walkIn.status==='arrived'&&walkIn.tableIds.includes(tableId));
    const countTableUsages=(records=[])=> (records||[]).reduce((sum,record)=>sum+(record.tableIds||[]).length,0);
    const countActualTables=(records=[])=>records.reduce((total,record)=>{
      if(!['arrived','completed'].includes(record.status))return total;
      const tableIds=new Set();
      (record.tableIds||[]).forEach(tableId=>{
        const group=state.groups.find(ids=>ids.includes(tableId));
        (group||[tableId]).forEach(id=>tableIds.add(id));
      });
      return total+tableIds.size;
    },0);
    const {
      navItems,
      navButton,
      shell,
      pageHead,
      newButton,
      walkInButton,
      statsMarkup,
      activeSessions,
      activeSessionControlsMarkup,
      overview,
      tableSelectionState,
      tablePickLabel,
      showTablePickerStatus,
      visibleFloorTableIds,
      tableCard,
      mapPage,
      bookingTable,
      customersPage,
      addVipCustomerGroup,
      organizeCustomerVenues,
      makeCustomerFlowCollapsible,
      depositsPage,
      reportsPage,
      historyPage,
      settingsPage,
      overviewDailyMetrics
    }=createViews({
      icon,
      ico,
      today,
      floors,
      childIdsOfTable,
      allTables,
      logicalTableCount,
      vipTableIds,
      recordBelongsToVenue,
      statusNames,
      bookingDisplayStatus,
      bookingIsOverdue,
      state,
      dateInRange,
      dateRangeText,
      esc,
      money,
      dateLabel,
      bookingTimeLabel,
      statusTag,
      displayTables,
      walkInDisplayName,
      walkInDisplayCount,
      dayBookings,
      bookingsForTable,
      countTableUsages,
      countActualTables
    });
    function render(){
      document.getElementById('app').innerHTML=shell();addMobileSettingsLink();
      const views={overview,map:mapPage,bookings:bookingTable,customers:customersPage,deposits:depositsPage,reports:reportsPage,history:historyPage,settings:settingsPage};
      document.getElementById('content').innerHTML=(views[state.page]||overview)();
      addVipCustomerGroup();
      organizeCustomerVenues();
      addDeletePasswordSetting();
      updateUnitLabels();
      if(state.page==='overview'){
        const stats=document.querySelector('.content .stats');
        if(stats){stats.outerHTML=statsMarkup(overviewDailyMetrics());document.querySelector('.content .stats')?.classList.add('overview-stats')}
        document.querySelectorAll('.floor-summary').forEach((summary,index)=>{
          const floor=floors[index];if(!floor)return;
          const busy=floor.tables.filter(tableId=>bookingsForTable(tableId).length||activeWalkInsForTable(tableId).length).length;
          summary.querySelector('small').textContent=`${busy} ${floorUnit(floor)} có lịch · ${floor.tables.length-busy} ${floorUnit(floor)} trống lịch`;
          summary.querySelector('.floor-count').innerHTML=`${busy}<span style="font:400 11px 'DM Sans',sans-serif;color:var(--muted)">/${floor.tables.length}</span>`;
        });
      }
      setSyncStatus(syncStatus);
      const storageRow=[...document.querySelectorAll('.setting-row')].find(row=>row.textContent.includes('Lưu trữ'));
      if(storageRow)storageRow.querySelector('small').textContent='Dữ liệu đồng bộ qua Supabase';
      if(!state.canManageData){
        document.querySelectorAll('[data-action="reset-data"],[data-action="delete-booking"],[data-action="clear-history"],[data-action="merge-mode"],[data-action="split-group"],[data-action="confirm-merge"]').forEach(button=>button.remove());
      }
      const signOutButton=document.createElement('button');signOutButton.type='button';signOutButton.className='icon-btn';signOutButton.title='Đăng xuất';signOutButton.setAttribute('aria-label','Đăng xuất');signOutButton.innerHTML=ico('close');signOutButton.addEventListener('click',signOut);document.querySelector('.top-actions').append(signOutButton);
      const alertButton=document.querySelector('[data-action="alerts"]');
      const late=state.overdueWarning?overdueBookings():[];
      if(alertButton){
        alertButton.title=late.length?`Cảnh báo: ${late.length} booking quá giờ`:`Cảnh báo`;
        alertButton.style.borderColor=late.length?'color-mix(in srgb,var(--red) 68%,var(--line))':'';
        alertButton.style.boxShadow=late.length?'0 0 0 2px color-mix(in srgb,var(--red) 22%,transparent)':'';
      }
      document.querySelector('.active-session-panel')?.addEventListener('toggle',event=>{state.activeSessionsOpen=event.currentTarget.open});
      bind();bindResetDataConfirmation();enableTimeDrag();bindTableAddButtons();bindOverviewActions();
    }
    const {
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
      buildGroupedTablePicker,
      groupBookingPicker,
      refreshBookingPicker,
      groupWalkInPicker,
      modal,
      openBooking,
      saveBooking,
      showTableConflictConfirmation,
      showConfirmation,
      showDeletePasswordConfirmation,
      deleteCurrentBooking,
      deleteWalkIn,
      openTable,
      openTableChange,
      saveTableChange,
      openWalkIn,
      saveWalkIn,
      cancelWalkIn,
      completeWalkIn,
      selectedActiveSessions,
      confirmActiveSessionAction,
      completeSelectedActiveSessions,
      cancelSelectedActiveSessions,
      openWalkInDetail,
      checkIn,
      completeBooking,
      cancelBooking,
      openBookingDetail,
      splitGroup,
      mergeSelected,
      exportCsv,
      moveBooking,
      moveWalkIn,
      customerHistory,
      walkInHistory,
      toggleTheme,
      updateElapsed
    }=createActions({
      supabase,
      baselineBookings,
      baselineWalkIns,
      icon,
      ico,
      today,
      floors,
      allTables,
      tableMeta,
      logicalTableCount,
      floorUnit,
      inventorySummary,
      vipTableIds,
      statusNames,
      normalizeBookingStatus,
      bookingDisplayStatus,
      state,
      dateInRange,
      bookingToRow,
      walkInToRow,
      loadSharedData,
      updateSharedCompletion,
      save,
      esc,
      money,
      dateLabel,
      statusTag,
      displayTables,
      walkInDisplayName,
      walkInDisplayCount,
      navItems,
      navButton,
      shell,
      activeSessions,
      overview,
      tablePickLabel,
      showTablePickerStatus,
      visibleFloorTableIds,
      render,
      getCurrentUser:()=>currentUser,
      getPersistenceQueue:()=>persistenceQueue
    });
    function bind(){document.querySelectorAll('[data-active-session]').forEach(input=>input.addEventListener('change',()=>{const key=input.dataset.activeSession;state.selectedActiveSessions=input.checked?[...new Set([...state.selectedActiveSessions,key])]:state.selectedActiveSessions.filter(item=>item!==key);render()}));document.querySelector('[data-action="toggle-active-session-selection"]')?.addEventListener('click',()=>{const sessions=activeSessions(),selected=new Set(state.selectedActiveSessions);state.selectedActiveSessions=sessions.length&&sessions.every(session=>selected.has(session.key))?[]:sessions.map(session=>session.key);render()});document.querySelector('[data-action="complete-active-sessions"]')?.addEventListener('click',completeSelectedActiveSessions);document.querySelector('[data-action="cancel-active-sessions"]')?.addEventListener('click',cancelSelectedActiveSessions);document.querySelectorAll('[data-overview-day]').forEach(button=>button.addEventListener('click',()=>shiftOverviewDate(Number(button.dataset.overviewDay))));document.querySelector('[data-overview-date]')?.addEventListener('change',event=>setOverviewDate(event.currentTarget.value));document.querySelectorAll('[data-page]').forEach(x=>x.addEventListener('click',()=>{state.page=x.dataset.page;render()}));document.querySelector('[data-date-from]')?.addEventListener('change',e=>{state.dateFrom=e.target.value; if(state.dateFrom>state.dateTo) state.dateTo=state.dateFrom; state.date=state.dateFrom; render()});document.querySelector('[data-date-to]')?.addEventListener('change',e=>{state.dateTo=e.target.value; if(state.dateTo<state.dateFrom) state.dateFrom=state.dateTo; state.date=state.dateTo; render()});document.querySelectorAll('[data-floor]').forEach(x=>x.addEventListener('click',()=>{state.floor=x.dataset.floor;render()}));document.querySelector('[data-action="theme"]')?.addEventListener('click',toggleTheme);document.querySelector('[data-action="new-booking"]')?.addEventListener('click',()=>openBooking());document.querySelector('[data-action="new-walk-in-global"]')?.addEventListener('click',()=>openWalkIn());document.querySelector('[data-setting-overdue]')?.addEventListener('change',e=>{state.overdueWarning=e.target.checked;localStorage.setItem('gk-overdue-warning',String(e.target.checked));render();});document.querySelector('[data-search]')?.addEventListener('input',e=>{state.search=e.target.value;const cursor=e.target.selectionStart;const value=e.target.value;const wrap=e.target.closest('.panel');const tbody=wrap.querySelector('tbody');const temp=document.createElement('div');temp.innerHTML=bookingTable();const newBody=temp.querySelector('tbody');tbody.innerHTML=newBody.innerHTML;tbody.querySelectorAll('[data-booking]').forEach(row=>row.addEventListener('click',()=>openBookingDetail(row.dataset.booking)));const inp=document.querySelector('[data-search]');inp.focus();inp.setSelectionRange(cursor,cursor)});document.querySelector('[data-status-filter]')?.addEventListener('change',e=>{state.statusFilter=e.target.value;render()});document.querySelector('[data-customer-search]')?.addEventListener('input',e=>{state.customerSearch=e.target.value;const cursor=e.target.selectionStart;render();const input=document.querySelector('[data-customer-search]');input.focus();input.setSelectionRange(cursor,cursor)});document.querySelectorAll('[data-customer-phone]').forEach(x=>x.addEventListener('click',()=>customerHistory(x.dataset.customerPhone)));document.querySelectorAll('[data-walk-in-history]').forEach(x=>x.addEventListener('click',()=>walkInHistory(x.dataset.walkInHistory)));document.querySelectorAll('[data-booking]').forEach(x=>x.addEventListener('click',e=>{if(e.target.closest('[draggable="true"]'))return;openBookingDetail(x.dataset.booking)}));document.querySelectorAll('[data-action="merge-mode"]').forEach(x=>x.addEventListener('click',()=>{state.mergeMode=true;state.selectedTables=[];render()}));document.querySelector('[data-action="cancel-merge"]')?.addEventListener('click',()=>{state.mergeMode=false;state.selectedTables=[];render()});document.querySelector('[data-action="confirm-merge"]')?.addEventListener('click',mergeSelected);document.querySelectorAll('[data-action="split-group"]').forEach(x=>x.addEventListener('click',()=>{const g=state.groups.find(g=>g.some(t=>floors.find(f=>f.id===state.floor)?.tables.includes(t)));if(!g){toast('Tầng này chưa có nhóm bàn ghép');return}splitGroup(g[0])}));document.querySelectorAll('[data-table]').forEach(card=>{card.addEventListener('click',e=>{if(e.target.closest('[data-booking]'))return;if(state.mergeMode){const id=card.dataset.table;state.selectedTables=state.selectedTables.includes(id)?state.selectedTables.filter(x=>x!==id):[...state.selectedTables,id];card.style.outline=state.selectedTables.includes(id)?'2px solid var(--green)':'';document.querySelector('[data-action="confirm-merge"]').innerHTML=`${ico('merge')} Xác nhận ghép (${state.selectedTables.length})`;return}openTable(card.dataset.table)});card.addEventListener('dragover',e=>{e.preventDefault();card.classList.add('drop-over')});card.addEventListener('dragleave',()=>card.classList.remove('drop-over'));card.addEventListener('drop',e=>{e.preventDefault();card.classList.remove('drop-over');const id=e.dataTransfer.getData('text/booking');if(id)moveBooking(id,card.dataset.table)})});document.querySelectorAll('[draggable="true"]').forEach(x=>x.addEventListener('dragstart',e=>e.dataTransfer.setData('text/booking',x.dataset.booking)));document.querySelectorAll('[data-report]').forEach(x=>x.addEventListener('click',()=>{state.reportMode=x.dataset.report;render()}));document.querySelector('[data-report-year]')?.addEventListener('change',e=>{const year=Math.max(2020,Math.min(2100,+e.target.value||2026));state.date=`${year}${state.date.slice(4)}`;render()});document.querySelector('[data-setting-theme]')?.addEventListener('change',toggleTheme);document.querySelector('[data-action="reset-data"]')?.addEventListener('click',()=>{if(!confirm('Xóa toàn bộ booking, lịch sử và nhóm bàn trên thiết bị này?'))return;state.bookings=[];state.history=[];state.groups=[];save();render();toast('Đã xóa dữ liệu trên thiết bị')});document.querySelector('[data-action="clear-history"]')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();clearHistory()});document.querySelector('[data-action="export"]')?.addEventListener('click',exportCsv);document.querySelector('[data-action="alerts"]')?.addEventListener('click',()=>{const late=overdueBookings();if(!late.length){toast('Không có booking quá giờ chưa check-in');return;}const rows=late.map(booking=>`<div class="booking-row" data-booking="${booking.id}"><div class="time-mark">${esc(booking.time)}</div><div class="booking-info"><strong>${esc(booking.name)}</strong><small>${esc(booking.guests)} khách · ${esc(booking.phone)}</small></div><span class="table-tag">${displayTables(booking)}</span><span class="status cancelled">Quá giờ</span></div>`).join('');modal('Cảnh báo booking quá giờ',`${late.length} booking chưa check-in trên ngày ${dateLabel(state.date,{day:'numeric',month:'long',year:'numeric'})}`,`${rows}`,'<button class="btn" data-action="close-modal">Đóng</button>',true);document.querySelectorAll('.modal [data-booking]').forEach(row=>row.addEventListener('click',()=>openBookingDetail(row.dataset.booking)));});document.querySelectorAll('[data-action="close-modal"]').forEach(x=>x.addEventListener('click',closeModal));document.querySelectorAll('[data-action="backdrop-close"]').forEach(x=>x.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()}));document.querySelector('[data-action="new-at-table"]')?.addEventListener('click',e=>openBooking(null,[e.currentTarget.dataset.tableId]));document.querySelector('[data-action="save-booking"]')?.addEventListener('click',saveBooking);document.querySelector('[data-action="edit-booking"]')?.addEventListener('click',e=>openBooking(e.currentTarget.dataset.id));document.querySelector('[data-detail-checkin]')?.addEventListener('click',e=>checkIn(e.currentTarget.dataset.detailCheckin));document.querySelector('[data-complete]')?.addEventListener('click',e=>completeBooking(e.currentTarget.dataset.complete));document.querySelector('[data-action="split-this"]')?.addEventListener('click',e=>splitGroup(e.currentTarget.dataset.tableId));updateElapsed()}
    document.addEventListener('input',event=>{
      const input=event.target.closest('[data-search]');
      if(!input||state.page!=='bookings')return;
      event.stopImmediatePropagation();
      state.search=input.value;
      const cursor=input.selectionStart;
      render();
      const refreshedInput=document.querySelector('[data-search]');
      refreshedInput.focus();
      refreshedInput.setSelectionRange(cursor,cursor);
    },true);
    document.addEventListener('input',e=>{
      const input=e.target.closest('[data-walk-in-customer-search]');
      if(!input)return;
      state.walkInSearch=input.value;
      const cursor=input.selectionStart;
      render();
      const restored=document.querySelector('[data-walk-in-customer-search]');
      restored?.focus();
      if(typeof cursor==='number')restored?.setSelectionRange(cursor,cursor);
    });
    document.addEventListener('dragstart',e=>{const slot=e.target.closest('.table-card .walk-in-slot[data-walk-in]');if(slot)e.dataTransfer.setData('text/walk-in',slot.dataset.walkIn)});
    document.addEventListener('drop',e=>{const card=e.target.closest('.table-card[data-table]'),id=e.dataTransfer.getData('text/walk-in');if(card&&id)moveWalkIn(id,card.dataset.table)});
    document.addEventListener('click',event=>{
      const historyButton=event.target.closest('[data-customer-phone][data-customer-venue]');
      if(!historyButton)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      customerHistory(historyButton.dataset.customerPhone,historyButton.dataset.customerVenue);
    },true);
    document.addEventListener('click',e=>{const customerWalkIn=e.target.closest('[data-customer-walk-in]');if(customerWalkIn){openWalkInDetail(customerWalkIn.dataset.customerWalkIn);return}const walkInSlot=e.target.closest('.table-card .slot[data-walk-in]');if(walkInSlot?.isConnected){openWalkInDetail(walkInSlot.dataset.walkIn);return}const slot=e.target.closest('.table-card .slot[data-booking]');if(slot?.isConnected){openTable(slot.closest('[data-table]').dataset.table);return}const row=e.target.closest('tr[data-booking],.modal .booking-row[data-booking]');if(row?.isConnected)openBookingDetail(row.dataset.booking)});
    window.addEventListener('focus',()=>void refreshSharedData());
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshSharedData()});
    startApp();setInterval(updateElapsed,1000);setInterval(()=>void refreshSharedData(),5000);
