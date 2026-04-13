export interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  verifyFolder: (path: string) => Promise<boolean>;
  startUpdate: (data: { acPath: string, zipUrl: string }) => Promise<{ success: boolean; error?: string }>;
  onUpdateStatus: (callback: (status: { step: string; progress: number; message?: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
