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
      downloadUrl: string;
    }>;
    openDownload(url: string): Promise<void>;
    openRepository(): Promise<void>;
    onMaximizeChange(callback: (isMaximized: boolean) => void): () => void;
  };
}
