/**
 * Order status → Badge variant mapping for the warehouse portal.
 *
 * Extracted from `modules/warehouse/pages/Orders.jsx` as part of refactor P4.6.
 * The same mapping is also re-used by sub-components inside
 * `components/orders/` so the warehouse's `Pending → warning, Confirmed → info,
 * Packed → primary, ...` color contract lives in one place.
 *
 * The shared `<StatusBadge>` primitive at `@shared/components/ui/StatusBadge`
 * uses a slightly different palette (the customer-facing one). The warehouse
 * portal keeps its own variant strings because they map to `<Badge>` props,
 * not to Tailwind classes directly.
 */
export function getOrderStatusVariant(status) {
    const s = String(status || '').toLowerCase();
    switch (s) {
        case 'pending':
            return 'warning';
        case 'confirmed':
            return 'info';
        case 'packed':
            return 'primary';
        case 'out_for_delivery':
            return 'secondary';
        case 'delivered':
            return 'success';
        case 'cancelled':
            return 'error';
        default:
            return 'secondary';
    }
}
