declare const __APP_VERSION__: string;

interface Window {
  desktopAPI?: {
    savePdf(
      bytes: Uint8Array,
      filename: string,
    ): Promise<{ canceled: boolean }>;
    isMaximized(): Promise<boolean>;
    minimize(): Promise<void>;
    toggleMaximize(): Promise<void>;
    close(): Promise<void>;
    checkUpdates(): Promise<{
      tag: string;
      publishedAt: string;
    }>;
    downloadUpdate(tag: string): Promise<{ installing: boolean }>;
    openRepository(): Promise<void>;
    onUpdateProgress(callback: (percent: number) => void): () => void;
    onUpdateInstalling(callback: () => void): () => void;
    onUpdateError(callback: (message: string) => void): () => void;
    onMaximizeChange(callback: (isMaximized: boolean) => void): () => void;
  };
}
