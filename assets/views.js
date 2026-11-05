import { createSharedViews } from './view-shared.js';
import { createOverviewViews } from './view-overview.js';
import { createMapViews } from './view-map.js';
import { createBookingsViews } from './view-bookings.js';
import { createCustomersViews } from './view-customers.js';
import { createReportsViews } from './view-reports.js';

export function createViews(context) {
  const shared = createSharedViews(context);
  const pageContext = { ...context, ...shared };
  return {
    ...shared,
    ...createOverviewViews(pageContext),
    ...createMapViews(pageContext),
    ...createBookingsViews(pageContext),
    ...createCustomersViews(pageContext),
    ...createReportsViews(pageContext)
  };
}
