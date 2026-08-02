# Real-time architecture (Socket.IO)

Production realtime stack for myTask: shared contracts in `@mytask/realtime`, JWT-authenticated Socket.IO gateway on the backend, and identical Zustand + TanStack Query sync on web and mobile.

## Event matrix

| Module | Event | Emitter | Consumers |
| --- | --- | --- | --- |
| Auth | `auth.login` | Backend (session create / optional) | Web + Mobile |
| Auth | `auth.logout` | Backend logout / session revoke | Web + Mobile |
| Employee | `employee.created` | Employee create | Web + Mobile (`org:{id}`) |
| Employee | `employee.updated` | Employee update | Web + Mobile |
| Employee | `employee.deleted` | Employee delete (when wired) | Web + Mobile |
| Timesheet | `timesheet.created` | Timesheet management create | Web + Mobile |
| Timesheet | `timesheet.updated` | Save / submit / approve / reject | Web + Mobile |
| Timesheet | `timesheet.deleted` | Delete (when wired) | Web + Mobile |
| Tracking | `tracking.updated` | Location store / BGL send-location (throttled ~3s; immediate on start/pause/resume/stop). Payload includes `timer` + `active`. Invalidates day editor, timesheet detail tables, dashboard. Clients show Live indicator. | Web + Mobile |

| Payroll | `payroll.created` | Employee payroll create | Web + Mobile |
| Payroll | `payroll.updated` | Employee payroll update | Web + Mobile |
| Report | `report.generated` | Report worker completed | Web + Mobile |
| Report | `report.updated` | Report queued / failed | Web + Mobile |
| Payout | `payout.created` | Payout create | Web + Mobile |
| Payout | `payout.updated` | Mark paid | Web + Mobile |
| Notification | `notification.created` | FirebaseMessaging / gateway | Web + Mobile (`user:{id}`) |
| Dashboard | `dashboard.updated` | After domain mutations | Web + Mobile |

Client control events: `org.join`, `org.leave`, `org.joined`, `org.left`, `org.error`.

## Rooms

| Room | Purpose |
| --- | --- |
| `user:{userId}` | Per-user events (notifications, forced logout) |
| `org:{organisationId}` | Organisation-scoped domain events |

Organisation rooms are joined only after server-side membership check (`user_organisation_roles`). Client-supplied org IDs are never trusted without validation.

## Backend gateway

- File: `backend/functions/socket-registry.js`
- Emit API: `backend/class/socket.io.js` + `backend/service/realtime.service.js`
- Handshake auth uses the same session token as REST (`Auth.verifyToken` + `Auth.getUserByToken`)
- Optional `SOCKETIO_TOKEN` remains for service/test clients only (still requires `user_id`)
- Redis adapter retained for multi-instance
- Workers (location queue) emit via `@socket.io/redis-emitter` when Socket.IO is not in-process

## Client architecture

| Layer | Package / location |
| --- | --- |
| Event names + payloads | `@mytask/realtime` |
| Singleton `SocketManager` | `@mytask/realtime` |
| Domain Zustand stores | `@mytask/realtime` (`employee`, `timesheet`, `payroll`, `report`, `payout`, `notification`, `dashboard`, `socket`) |
| Query invalidation bridge | `applyRealtimeToClientState` |
| Offline queue | `sharedOfflineQueue` (mobile persists to AsyncStorage) |
| Web lifecycle | `web/src/providers/RealtimeProvider.tsx` |
| Mobile lifecycle | `mobile/src/providers/RealtimeProvider.tsx` |
| Logout wipe | `resetAllStores()` (web + mobile) |

TanStack Query remains the primary server cache; socket events upsert domain stores **and** invalidate the matching query prefixes so existing screens update without full-page reloads.

## Logout (atomic)

1. Backend logout (best effort) → emits `auth.logout` to `user:{id}`
2. Disconnect socket
3. Clear auth token + org context
4. `resetDomainStores()` + `queryClient.clear()`
5. Clear session/local/AsyncStorage mytask keys (theme/sidebar retained on web)
6. Navigate to login / block protected routes

## Cross-device validation checklist

1. User A web + User B mobile, same org
2. B creates timesheet → A list updates without refresh
3. A marks payout paid → B eligible/list updates
4. A logs out → socket disconnects; no further events
5. B offline mutation queued → flushes on reconnect

## Security notes

- Never join `org:*` from client without server membership validation
- Never accept handshake `user_id` as identity for user tokens
- Lock CORS via `SOCKETIO_CORS_ORIGINS` in production
