import { IPC_CHANNELS } from '@shared/types';
import type { UpdaterState } from '@shared/types/updater';
import { isUpdateChannel } from '@shared/updater/channel';
import { isAutoRestartMode } from '@shared/updater/idleRestart';
import { app, ipcMain } from 'electron';
import { appDesktop } from '../services/desktopHooks';
import { discardLegacyInterruptedSessions } from '../services/updater/interruptedSessions';

/** 没有为当前桌面发行版配置更新源时，保留 IPC 兼容但不加载更新器。 */
function isUpdaterEnabled(): boolean {
  return appDesktop().updaterAvailable();
}

export function registerUpdaterHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.UPDATER_GET_STATE,
    (): UpdaterState => ({ host: 'desktop', status: null })
  );

  try {
    discardLegacyInterruptedSessions(app.getPath('userData'));
  } catch (error) {
    console.error('Failed to discard legacy interrupted-by-update record:', error);
  }

  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, async () => {
    if (!isUpdaterEnabled()) return;
    const { autoUpdaterService } = await import('../services/updater/AutoUpdater');
    await autoUpdaterService.checkForUpdates();
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_DOWNLOAD_UPDATE, async () => {
    if (!isUpdaterEnabled()) return;
    const { autoUpdaterService } = await import('../services/updater/AutoUpdater');
    await autoUpdaterService.downloadUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_QUIT_AND_INSTALL, async () => {
    if (!isUpdaterEnabled()) return;
    const { autoUpdaterService } = await import('../services/updater/AutoUpdater');
    return autoUpdaterService.requestRestart();
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_SET_AUTO_UPDATE_ENABLED, async (_event, enabled: unknown) => {
    if (!isUpdaterEnabled() || typeof enabled !== 'boolean') return;
    const { autoUpdaterService } = await import('../services/updater/AutoUpdater');
    autoUpdaterService.setAutoUpdateEnabled(enabled);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_SET_AUTO_RESTART_MODE, async (_event, mode: unknown) => {
    if (!isUpdaterEnabled() || !isAutoRestartMode(mode)) return;
    const { autoUpdaterService } = await import('../services/updater/AutoUpdater');
    autoUpdaterService.setAutoRestartMode(mode);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_SET_CHANNEL, async (_event, channel: unknown) => {
    if (!isUpdaterEnabled() || !isUpdateChannel(channel)) return;
    const { autoUpdaterService } = await import('../services/updater/AutoUpdater');
    autoUpdaterService.setChannel(channel);
  });
}
