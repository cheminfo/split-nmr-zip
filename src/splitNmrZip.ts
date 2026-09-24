import { NMRiumCore } from '@zakodium/nmrium-core';
import { recommended } from '@zakodium/nmrium-core-plugins';
import type { ZipFileContent } from 'file-collection';
import { FileCollection } from 'file-collection';

import type { NmrZipEntry, SplitNmrZipOptions } from './types.ts';
import { findExperimentFiles } from './utils/findExperimentFiles.ts';
import { toExperimentMeta } from './utils/toExperimentMeta.ts';

/**
 * Split an archive holding several NMR experiments into one zip per
 * experiment, each with the acquisition parameters read from its own parameter
 * files.
 *
 * A Bruker archive stores every experiment in its own numbered directory
 * (`expno`) next to the others, so a single upload usually carries a whole
 * series. This returns them separated, ready to be stored or displayed one by
 * one.
 *
 * An `expno` that holds only parameter files, with no `fid` and no processed
 * data, is not an experiment and does not appear in the result: the reader
 * rejects it before this sees it. Calibration and setup directories such as
 * `98888` disappear that way.
 * @param zip - The archive: a `File`, `Blob`, `ArrayBuffer`, `Uint8Array` or a
 *   `ReadableStream`, so the same call works in the browser and in Node.js.
 * @param options - Which experiments to keep and which data to describe.
 * @returns One entry per experiment, in the order the reader found them.
 * @example
 * ```ts
 * const entries = await splitNmrZip(await file.arrayBuffer());
 * for (const { meta, zip } of entries) {
 *   console.log(meta.experimentNumber, meta.solvent, meta.pulseSequence);
 * }
 * ```
 */
export async function splitNmrZip(
  zip: ZipFileContent,
  options: SplitNmrZipOptions = {},
): Promise<NmrZipEntry[]> {
  const {
    dataSelection = 'preferFT',
    keep1D = true,
    keep2D = true,
    experimentNumbers,
    logger,
  } = options;

  const collection = await FileCollection.fromZip(zip, { logger });

  const core = new NMRiumCore();
  core.registerPlugins(recommended(core));
  const { state } = await core.read(collection, {
    logger,
    selector: {
      bruker: {
        dataSelection,
        keep1D,
        keep2D,
        experimentNumbers: experimentNumbers?.join(','),
      },
      // A composite JCAMP-DX holds the FID and the spectrum in one file, and
      // without this both come back, pointing at that same single file. The
      // JCAMP-DX loader reads the setting from `general`, not from `jcamp`.
      general: { dataSelection },
    },
  });

  const found = [];
  for (const spectrum of state.data?.spectra ?? []) {
    const meta = toExperimentMeta(spectrum.info);
    const files = findExperimentFiles(collection, meta.name);
    if (!files) {
      logger?.warn(`no file matches "${meta.name}", experiment skipped`);
      continue;
    }
    found.push({ meta, files });
  }

  return Promise.all(
    found.map(async ({ meta, files }) => ({ meta, zip: await files.toZip() })),
  );
}
