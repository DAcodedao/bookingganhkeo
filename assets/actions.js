import { createUiActions } from './action-ui.js';
import { createBookingsActions } from './action-bookings.js';
import { createWalkinsActions } from './action-walkins.js';
import { createSessionsActions } from './action-sessions.js';
import { createTablesActions } from './action-tables.js';
import { createHistoryActions } from './action-history.js';

const actionNames = [ 'bindResetDataConfirmation', 'addDeletePasswordSetting', 'updateUnitLabels', 'openDeletePasswordSettings', 'clearHistory', 'addMobileSettingsLink', 'bindOverviewActions', 'bindTableAddButtons', 'enableTimeDrag', 'audit', 'toast', 'closeModal', 'toggleTheme', 'updateElapsed', 'buildGroupedTablePicker', 'groupBookingPicker', 'refreshBookingPicker', 'modal', 'openBooking', 'saveBooking', 'showTableConflictConfirmation', 'showConfirmation', 'showDeletePasswordConfirmation', 'deleteCurrentBooking', 'openTableChange', 'saveTableChange', 'checkIn', 'completeBooking', 'cancelBooking', 'openBookingDetail', 'exportCsv', 'deleteWalkIn', 'groupWalkInPicker', 'openWalkIn', 'saveWalkIn', 'cancelWalkIn', 'completeWalkIn', 'openWalkInDetail', 'walkInHistory', 'selectedActiveSessions', 'confirmActiveSessionAction', 'completeSelectedActiveSessions', 'cancelSelectedActiveSessions', 'openTable', 'splitGroup', 'mergeSelected', 'moveBooking', 'moveWalkIn', 'customerHistory' ];

export function createActions(context) {
  const actions = {};
  const callbacks = Object.fromEntries(actionNames.map(name => [name, (...args) => actions[name](...args)]));
  const actionContext = { ...context, ...callbacks };
  Object.assign(
    actions,
    createUiActions(actionContext),
    createBookingsActions(actionContext),
    createWalkinsActions(actionContext),
    createSessionsActions(actionContext),
    createTablesActions(actionContext),
    createHistoryActions(actionContext)
  );
  document.addEventListener('change', event => {
    if (event.target.id === 'booking-date') actions.refreshBookingPicker(event.target.value);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') actions.closeModal();
  });
  document.addEventListener('toggle', event => {
    const target = event.target;
    if (target.matches?.('[data-customer-group]')) {
      if (target.dataset.customerGroup in context.state.customerVenueOpen) context.state.customerVenueOpen[target.dataset.customerGroup] = target.open;
      return;
    }
    if (target.matches?.('[data-customer-flow]') && target.dataset.customerFlow in context.state.customerFlowOpen) context.state.customerFlowOpen[target.dataset.customerFlow] = target.open;
    if (target.matches?.('[data-booking-venue]')) context.state.bookingVenueOpen[target.dataset.bookingVenue] = target.open;
    if (target.matches?.('[data-report-venue]')) context.state.reportVenueOpen[target.dataset.reportVenue] = target.open;
    if (target.matches?.('[data-report-flow]')) context.state.reportFlowOpen[target.dataset.reportFlow] = target.open;
  }, true);
  return actions;
}
