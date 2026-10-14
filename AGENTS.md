# Printing architecture
- Keep print layout selection in `src/lib/printLayout.ts` and apply it in the shared `executePrint` utility so all report print buttons share the same behavior.
- Preserve the uploaded application framework and existing storage/authentication; this source delivery changes printing only.
- New devices join cloud sync via the access-key box on the login screen (AuthScreen), because staff data only arrives after joining.
- `initLiveVersionWatcher` polls index.html and reloads when a new build is published, so all devices auto-update.
