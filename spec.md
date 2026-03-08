# Pavithra Explosives

## Current State
- Full-stack app with Motoko backend and React frontend
- Order flow: pending → approved/rejected → accepted → delivered → billDone
- Driver can mark "Delivered" when order is in "Accepted" state
- Office marks "Bill Done" after delivery
- New Indent enforces 1 order per blaster per day (backend check exists)

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
- **Backend status flow**: Change order from `accepted → delivered → billDone` to `accepted → billDone → delivered`. The Office panel marks "Bill Done" first (on Accepted orders), then the Driver can mark "Delivered" (on billDone orders).
- **Frontend - Office Panel**: Show "Bill Done" button on orders with status `accepted` (not `delivered`)
- **Frontend - Driver Panel**: Show "Delivered" button on orders with status `billDone` (not `accepted`). Driver can only press Delivered after Bill Done is marked.
- **Frontend - Driver Panel**: Also show `billDone` orders in the driver view list
- **Frontend - Office Panel**: Also show `billDone` orders in the office view list (already delivered means no action needed)
- **Frontend - New Indent**: Ensure error message "Only 1 order allowed per blaster per day" is shown clearly when duplicate is attempted

### Remove
- Remove the old `accepted → delivered` and `delivered → billDone` transitions from the backend

## Implementation Plan
1. Regenerate backend with new status transition: `accepted → billDone → delivered`
2. Update `OrderCard` component: Office shows "Bill Done" on `accepted` orders; Driver shows "Delivered" on `billDone` orders
3. Update `DriverViewScreen`: include `billDone` status orders in the displayed list
4. Update `OfficeViewScreen`: show "Bill Done" button on `accepted` orders (not `delivered`)
5. Validate and deploy
