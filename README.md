# split-nmr-zip

[![NPM version](https://img.shields.io/npm/v/split-nmr-zip.svg)](https://www.npmjs.com/package/split-nmr-zip)
[![npm download](https://img.shields.io/npm/dm/split-nmr-zip.svg)](https://www.npmjs.com/package/split-nmr-zip)
[![test coverage](https://img.shields.io/codecov/c/github/cheminfo/split-nmr-zip.svg)](https://codecov.io/gh/cheminfo/split-nmr-zip)
[![license](https://img.shields.io/npm/l/split-nmr-zip.svg)](https://github.com/cheminfo/split-nmr-zip/blob/main/LICENSE)

Split a zip of NMR data into one zip per experiment, with its acquisition metadata.

A Bruker archive keeps every experiment in its own numbered directory (`expno`)
next to the others, so one upload usually carries a whole series — a proton, a
NOESY, a J-resolved, a calibration. Dropped into an ELN as a single file, that
series is opaque. This splits it: one standalone zip per experiment, each with
the solvent, frequency, nucleus and pulse sequence already read out of its
parameter files.

It works the same in the browser and in Node.js.

## Installation

```console
npm install split-nmr-zip
```

## Usage

```js
import { splitNmrZip } from 'split-nmr-zip';

// A File from an <input>, a Blob, an ArrayBuffer, a Uint8Array or a stream.
const entries = await splitNmrZip(file);

for (const { meta, zip } of entries) {
  console.log(meta.experimentNumber, meta.nucleus[0], meta.pulseSequence);
  // 10 '1H' 'zg30'
  // 11 '1H' 'zgpsd0'
  // 12 '1H' 'noesygpps1d.comp'
  // 13 '1H' 'jresgppsqf.2'
  await upload(zip); // a standalone, readable Bruker archive
}
```

Each `zip` keeps the paths the source archive used, so it is itself a valid
single-experiment archive — feed it back to `splitNmrZip`, to NMRium, or to
anything else that reads Bruker data.

### Metadata

`meta` carries the acquisition parameters, normalised. Per-dimension values are
always arrays — one entry in 1D, two in 2D — so nothing has to test which it
got:

| field                               | example                            |
| ----------------------------------- | ---------------------------------- |
| `name`                              | `coffee/10`                        |
| `experimentNumber`                  | `10`                               |
| `nucleus`                           | `['1H']`, or `['1H', '13C']` in 2D |
| `dimension`                         | `1`                                |
| `isFid`                             | `false`                            |
| `solvent`                           | `CDCl3`                            |
| `pulseSequence` / `experiment`      | `zg30` / `1d`                      |
| `baseFrequency` / `originFrequency` | `[400.13]` / `[400.13188235]` MHz  |
| `fieldStrength`                     | `9.3977` T                         |
| `numberOfScans` / `temperature`     | `8` / `300` K                      |
| `date` / `probeName` / `title`      | `2012-06-02T12:41:55.000Z`         |

`solvent` is whatever the operator typed, so it is not necessarily a solvent
anyone else would recognise.

### The shapes it accepts

People zip Bruker data in every possible way, so the experiment directory is
found wherever it is rather than at a fixed depth:

| the archive contains                               | result                                    |
| -------------------------------------------------- | ----------------------------------------- |
| `sample/10/…`, `sample/11/…`                       | one entry per expno, `name` = `sample/10` |
| `10/…`, `11/…`                                     | one entry per expno, `name` = `10`        |
| `ab/cd/10/…`                                       | one entry, `name` = `ab/cd/10`            |
| `10.zip`, `11.zip` (zips inside the zip)           | one entry per inner zip                   |
| `acqus`, `fid`, `pdata/1/1r` at the root           | one entry, `name` = `''`                  |
| `a.jdx`, `b.dx`, `c.jcamp`                         | one entry per file, `name` = `a`          |
| `sample.fid.jdx` next to `sample.jdx`              | two entries, each with its own file       |
| one JCAMP-DX holding both the FID and the spectrum | **one** entry, not the file twice         |

Nested zips are expanded on the way in, so an archive of per-experiment zips
works without being unpacked first. `experimentNumber` is read from the
directory name where there is one — including `10.zip` — and is `undefined`
when the archive carries no expno at all, or for a JCAMP-DX file.

A JCAMP-DX file holds a whole experiment, so it is an entry on its own and the
zip contains just that file. A _composite_ one — the FID and the processed
spectrum in a single document, which is what a Bruker export produces — would
otherwise come back as two spectra pointing at the same file; `dataSelection`
settles which of the two describes the entry.

### Options

```js
const entries = await splitNmrZip(file, {
  dataSelection: 'preferFT', // 'ft' | 'fid' | 'preferFT' | 'preferFID'
  keep1D: true,
  keep2D: true,
  experimentNumbers: [10, 11],
  logger,
});
```

An experiment holding both a FID and a processed spectrum would otherwise be
described twice, so `dataSelection` says which of the two to read the metadata
from; `preferFT` takes the processed spectrum and falls back to the FID. The
zip always holds every file of the experiment, whichever is selected.

An `expno` with parameter files but no data at all — the calibration and setup
directories Bruker leaves behind, typically `98888` — is not an experiment and
does not appear in the result.

## In the browser, without a bundler

Each release is also published to lactame.com as a self-contained UMD build
(~1.9 MB minified: everything it needs is inlined, nothing else to load). That
is what the cheminfo visualizer loads, since it has no build step:

```js
// in a visualizer view, through an alias on ../../lib/split-nmr-zip/<version>/
const { splitNmrZip } = await API.require('SplitNmrZip');
const entries = await splitNmrZip(droppedFile);
```

It registers with AMD when `define.amd` is present, and otherwise exposes the
global `SplitNmrZip`:

```html
<script src="https://www.lactame.com/lib/split-nmr-zip/0.0.0/split-nmr-zip.umd.min.js"></script>
<script>
  SplitNmrZip.splitNmrZip(file).then((entries) => console.log(entries.length));
</script>
```

## License

[MIT](./LICENSE)

The NMR readers it builds on — `@zakodium/nmrium-core`,
`@zakodium/nmrium-core-plugins` and the rest of the stack — are
**CC-BY-NC-SA-4.0**. The MIT above covers this package's own code; the terms of
those dependencies still apply to whoever installs them.
