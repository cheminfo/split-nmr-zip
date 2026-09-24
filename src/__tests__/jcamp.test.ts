import { readFileSync } from 'node:fs';

import { FileCollection } from 'file-collection';
import { expect, test } from 'vitest';

import { splitNmrZip } from '../index.ts';

// A JCAMP-DX file holds a whole experiment, so it is one entry on its own —
// there is no directory to group by.
const COMPOSITE = 'node_modules/jcamp-data-test/data/nmr/cytisine/cosy.jdx';

test('each JCAMP-DX file of the archive is its own experiment', async () => {
  const collection = new FileCollection();
  await collection.appendText('a.jdx', jcamp('alpha'));
  await collection.appendText('spectra/b.dx', jcamp('beta'));
  await collection.appendText('spectra/c.jcamp', jcamp('gamma'));

  const entries = await splitNmrZip(await collection.toZip());

  expect(entries.map((entry) => entry.meta.name)).toStrictEqual([
    'a',
    'b',
    'c',
  ]);

  const files = await Promise.all(
    entries.map(async (entry) => {
      const inner = await FileCollection.fromZip(entry.zip);
      return inner.files.map((file) => file.relativePath);
    }),
  );

  expect(files).toStrictEqual([
    ['a.jdx'],
    ['spectra/b.dx'],
    ['spectra/c.jcamp'],
  ]);
});

test('a name carrying a second extension still matches its file', async () => {
  // `sample.fid.jdx` is how a FID is conventionally named next to its spectrum.
  const collection = new FileCollection();
  await collection.appendText('sample.fid.jdx', jcamp('the fid'));
  await collection.appendText('sample.jdx', jcamp('the spectrum'));

  const entries = await splitNmrZip(await collection.toZip());

  expect(entries.map((entry) => entry.meta.name)).toStrictEqual([
    'sample.fid',
    'sample',
  ]);

  const first = await FileCollection.fromZip(entries[0]?.zip as Uint8Array);

  expect(first.files.map((file) => file.relativePath)).toStrictEqual([
    'sample.fid.jdx',
  ]);
});

test('a composite JCAMP-DX yields one entry, not the same file twice', async () => {
  // This file holds the FID and the processed spectrum in one document. Both
  // point at the same single file, so without `dataSelection` reaching the
  // JCAMP-DX loader it would be attached twice.
  const collection = new FileCollection();
  await collection.appendText(
    'cytisine/cosy.jdx',
    readFileSync(COMPOSITE, 'latin1'),
  );
  const archive = await collection.toZip();

  const preferred = await splitNmrZip(archive);

  expect(preferred).toHaveLength(1);
  expect(preferred[0]?.meta.isFid).toBe(false);
  expect(preferred[0]?.meta.dimension).toBe(2);
  expect(preferred[0]?.meta.name).toBe('cosy');

  const raw = await splitNmrZip(archive, { dataSelection: 'fid' });

  expect(raw).toHaveLength(1);
  expect(raw[0]?.meta.isFid).toBe(true);
});

function jcamp(title: string): string {
  return `##TITLE=${title}
##JCAMP-DX=4.24
##DATA TYPE=NMR SPECTRUM
##.OBSERVE FREQUENCY=400
##.OBSERVE NUCLEUS=^1H
##XUNITS=HZ
##YUNITS=ARBITRARY UNITS
##FIRSTX=0
##LASTX=4
##NPOINTS=5
##FIRSTY=1
##XFACTOR=1
##YFACTOR=1
##XYDATA=(X++(Y..Y))
0 1 2 3 2 1
##END=
`;
}
