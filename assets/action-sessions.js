export function createSessionsActions(context) {
  const {
    baselineBookings,
    baselineWalkIns,
    state,
    bookingToRow,
    walkInToRow,
    updateSharedCompletion,
    activeSessions,
    render,
    audit,
    toast,
    showConfirmation
  } = context;
    function selectedActiveSessions(){
      const selected=new Set(state.selectedActiveSessions);
      return activeSessions().filter(session=>selected.has(session.key));
    }

    function confirmActiveSessionAction(sessions,action,onConfirm){
      if(!sessions.length){toast('Chọn ít nhất một lượt đang sử dụng');return}
      const preview=sessions.slice(0,4).map(session=>`${session.name} · ${session.tables}`).join(', ');
      const remaining=sessions.length>4?` và ${sessions.length-4} lượt khác`:'';
      const isComplete=action==='complete';
      showConfirmation({
        title:isComplete?'Hoàn tất các lượt đã chọn?':'Hủy các lượt đã chọn?',
        message:isComplete?'Các lượt được chọn sẽ được lưu vào báo cáo và bàn/phòng sẽ được giải phóng.':'Các lượt được chọn sẽ bị hủy và bàn/phòng sẽ được giải phóng.',
        confirmLabel:isComplete?'Hoàn tất đã chọn':'Hủy đã chọn',
        iconName:isComplete?'check':'close',
        tone:isComplete?'success':'danger',
        details:[{label:'Số lượt',value:`${sessions.length} lượt`},{label:'Đang chọn',value:`${preview}${remaining}`}],
        onConfirm
      });
    }

    function completeSelectedActiveSessions(){
      const sessions=selectedActiveSessions();
      confirmActiveSessionAction(sessions,'complete',async()=>{
        const completedAt=new Date().toISOString(),completed=[],failed=[];
        for(const session of sessions){
          try{
            const table=session.kind==='booking'?'bookings':'walk_ins';
            const updated=await updateSharedCompletion(table,session.id,completedAt);
            if(!updated){failed.push(session);continue}
            const record=session.kind==='booking'?state.bookings.find(item=>item.id===session.id):state.walkIns.find(item=>item.id===session.id);
            if(!record||record.status!=='arrived'){failed.push(session);continue}
            record.status='completed';record.completedAt=completedAt;
            if(session.kind==='booking')baselineBookings.set(record.id,bookingToRow(record));
            else baselineWalkIns.set(record.id,walkInToRow(record));
            completed.push(session);
          }catch(error){console.error(error);failed.push(session)}
        }
        state.selectedActiveSessions=failed.map(session=>session.key);
        if(completed.length)audit('Hoàn tất nhiều lượt',`${completed.length} lượt · ${completed.map(session=>`${session.name} · ${session.tables}`).join('; ')}`);
        render();
        toast(failed.length?`Đã hoàn tất ${completed.length} lượt; ${failed.length} lượt chưa cập nhật, vui lòng thử lại.`:`Đã hoàn tất ${completed.length} lượt đang sử dụng`);
      });
    }

    function cancelSelectedActiveSessions(){
      const sessions=selectedActiveSessions();
      confirmActiveSessionAction(sessions,'cancel',()=>{
        const cancelled=[];
        for(const session of sessions){
          const record=session.kind==='booking'?state.bookings.find(item=>item.id===session.id):state.walkIns.find(item=>item.id===session.id);
          if(!record||record.status!=='arrived'||record.date!==state.date)continue;
          record.status='cancelled';
          if(session.kind==='booking')record.cancelledAt=new Date().toISOString();
          else record.completedAt=new Date().toISOString();
          cancelled.push(session);
        }
        state.selectedActiveSessions=[];
        if(cancelled.length)audit('Hủy nhiều lượt',`${cancelled.length} lượt · ${cancelled.map(session=>`${session.name} · ${session.tables}`).join('; ')}`);
        render();
        toast(`Đã hủy ${cancelled.length} lượt đang sử dụng`);
      });
    }
  return {
    selectedActiveSessions,
    confirmActiveSessionAction,
    completeSelectedActiveSessions,
    cancelSelectedActiveSessions
  };
}
