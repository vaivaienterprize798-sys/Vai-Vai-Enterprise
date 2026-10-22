# Printing architecture
- Keep print layout selection in `src/lib/printLayout.ts` and apply it in the shared `executePrint` utility so all report print buttons share the same behavior.
- Preserve the uploaded application framework and existing storage/authentication; this source delivery changes printing only.
- New devices join cloud sync via the access-key box on the login screen (AuthScreen), because staff data only arrives after joining.
- `initLiveVersionWatcher` polls index.html and reloads when a new build is published, so all devices auto-update.

# Stock average purchase rate
- `purchaseAvgRate` is always the all-time weighted average of purchase invoice lines (total purchase value / total purchased qty), derived from the full invoice history by `computeAllTimeAvgRateForItem` in `src/lib/storage.ts`. Sales never change it and an empty stock never resets it. `storageService.reconcileStockAvgRates()` repairs any drift and must stay wired on app startup and after cloud invoice/stock sync. Never replace this with incremental average-carry-forward math.
