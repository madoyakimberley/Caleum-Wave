// Uses Origin Private File System (OPFS) - Real device disk files
export async function saveAudioFileToDisk(
  filename: string,
  blob: Blob,
): Promise<void> {
  if (typeof window === "undefined" || !navigator.storage?.getDirectory) {
    throw new Error("File System Access is not supported on this device.");
  }

  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function getAudioFileFromDisk(
  filename: string,
): Promise<File | null> {
  try {
    if (typeof window === "undefined" || !navigator.storage?.getDirectory)
      return null;

    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(filename);
    return await fileHandle.getFile();
  } catch (error) {
    console.error(
      `[OPFS READ ERROR] File "${filename}" not found on disk:`,
      error,
    );
    return null;
  }
}

export async function deleteAudioFileFromDisk(filename: string): Promise<void> {
  try {
    if (typeof window === "undefined" || !navigator.storage?.getDirectory)
      return;

    const root = await navigator.storage.getDirectory();
    await root.removeEntry(filename);
  } catch (error) {
    console.error(`[OPFS DELETE ERROR] Could not delete "${filename}":`, error);
  }
}
