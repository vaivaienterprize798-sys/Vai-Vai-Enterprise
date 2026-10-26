# Printing architecture
- Keep print layout selection in `src/lib/printLayout.ts` and apply it in the shared `executePrint` utility so all report print buttons share the same behavior.
- Preserve the uploaded application framework and existing storage/authentication; this source delivery changes printing only.
- New devices join cloud sync via the access-key box on the login screen (AuthScreen), because staff data only arrives after joining.
- `initLiveVersionWatcher` polls index.html and reloads when a new build is published, so all devices auto-update.

# Stock average purchase rate
- `purchaseAvgRate` is always the all-time weighted average of purchase invoice lines (total purchase value / total purchased qty), derived from the full invoice history by `computeAllTimeAvgRateForItem` in `src/lib/storage.ts`. Sales never change it and an empty stock never resets it. `storageService.reconcileStockAvgRates()` repairs any drift and must stay wired on app startup and after cloud invoice/stock sync. Never replace this with incremental average-carry-forward math.

# Stock quantity sync
- Invoice stock movements are sent to Firestore only as atomic `increment()` deltas via `cloudDbService.incrementStockQuantity`, never as absolute quantities, so concurrent devices cannot overwrite each other. Only a manual stock edit (`saveStockItem`) writes an absolute quantity.
- Failed cloud writes are kept in retry queues (`vv_pending_writes`, `vv_pending_increments`) and overlaid on incoming snapshots, so a snapshot never rolls local data back. Snapshot listeners must not push data back to the cloud (avoids device ping-pong and quota exhaustion).

# Device roles (main vs secondary)
- `src/lib/deviceRole.ts` decides once per device: a device that already had data is "main"; any device that logs in fresh is "secondary" with a `joinedAt` time. Secondary devices never load the bundled seed file, never bulk-download or bulk-upload on startup, and every cloud read passes through `filterForDevice` so only records stamped `_syncedAt >= joinedAt` arrive (staff/company/appSettings always sync so logins work). Every single-record cloud write must go through `stampForCloud`; bulk re-uploads keep existing stamps so they never make old data look new.
- A user-initiated backup restore (`restoreBackup` with syncToCloud) promotes the device to main, because a fresh install is secondary and its filtered snapshots would otherwise wipe the restored data. Snapshots whose device-filtered result is empty never overwrite existing local data.
- Signing in with Google (non-anonymous) marks the device main, downloads all cloud data, uploads local data and restarts listeners, because the owner's Gmail device must always see the full data.
- `downloadAllFromCloud` merges cloud rows into local rows by id (`mergeById`) and never replaces the local list, so a cloud download can never shrink restored data.
- `initLiveVersionWatcher` (src/lib/appUpdate.ts) is started in main.tsx; it compares the asset names in the published index.html with the loaded ones and reloads on change.
