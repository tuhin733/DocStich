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
    onMaximizeChange(callback: (isMaximized: boolean) => void): () => void;
  };
}
