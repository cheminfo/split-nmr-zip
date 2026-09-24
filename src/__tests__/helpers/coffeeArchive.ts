import { coffee } from 'bruker-data-test';
import { FileCollection } from 'file-collection';

/** Sample of the `bruker-data-test` coffee dataset used across the tests. */
export const SAMPLE = 'UV1010_M1-1003-1002_6268756_ErISKLIoeB';

export interface ArchiveFile {
  /** Path below the sample directory, for example `10/acqus`. */
  path: string;
  buffer: Uint8Array;
}

/**
 * Read the files of the coffee sample from the test dataset.
 * @param expnos - Experiment directories to read; all of them when omitted.
 * @returns The files, with paths relative to the sample directory.
 */
export async function coffeeFiles(expnos?: string[]): Promise<ArchiveFile[]> {
  const files = Array.from(await coffee.filesValues());
  return Promise.all(
    files
      .filter((file) => {
        if (!file.relativePath.startsWith(`${SAMPLE}/`)) return false;
        if (!expnos) return true;
        return expnos.some((expno) =>
          file.relativePath.startsWith(`${SAMPLE}/${expno}/`),
        );
      })
      .map(async (file) => ({
        path: file.relativePath.slice(SAMPLE.length + 1),
        buffer: await file.buffer(),
      })),
  );
}

/**
 * Zip files in memory, so a test can give the archive any shape it needs.
 * @param files - The files to zip.
 * @param rewrite - Maps each path to the one the archive should use.
 * @returns The archive.
 */
export async function zipFiles(
  files: ArchiveFile[],
  rewrite: (path: string) => string = (path) => path,
): Promise<Uint8Array> {
  const collection = new FileCollection();
  await Promise.all(
    files.map(async (file) =>
      collection.appendArrayBuffer(rewrite(file.path), file.buffer),
    ),
  );
  return collection.alphabetical().toZip();
}
