import { FifoLogger } from 'fifo-logger';
import { FileCollection } from 'file-collection';
import { expect, test } from 'vitest';

import { splitNmrZip } from '../index.ts';

import { SAMPLE, coffeeFiles, zipFiles } from './helpers/coffeeArchive.ts';

const archive = await zipFiles(
  await coffeeFiles(),
  (path) => `${SAMPLE}/${path}`,
);

test('one entry per experiment, in expno order', async () => {
  const entries = await splitNmrZip(archive);

  expect(entries.map((entry) => entry.meta.experimentNumber)).toStrictEqual([
    10, 11, 12, 13, 99999,
  ]);
  expect(entries.map((entry) => entry.meta.name)).toStrictEqual([
    `${SAMPLE}/10`,
    `${SAMPLE}/11`,
    `${SAMPLE}/12`,
    `${SAMPLE}/13`,
    `${SAMPLE}/99999`,
  ]);
});

test('expno 98888 holds no data and is dropped', async () => {
  const entries = await splitNmrZip(archive);
  const expnos = entries.map((entry) => entry.meta.experimentNumber);

  expect(expnos).not.toContain(98888);

  // It is in the archive, so the archive really did exercise the rejection.
  const files = await FileCollection.fromZip(archive);

  expect(
    files.files.some((file) =>
      file.relativePath.startsWith(`${SAMPLE}/98888/`),
    ),
  ).toBe(true);
});

test('metadata of a 1D experiment', async () => {
  const entries = await splitNmrZip(archive);

  expect(entries[0]?.meta).toStrictEqual({
    name: `${SAMPLE}/10`,
    experimentNumber: 10,
    nucleus: ['1H'],
    dimension: 1,
    isFid: false,
    solvent: 'COFFEE_calctemp',
    pulseSequence: 'zg30',
    experiment: '1d',
    baseFrequency: [400.13],
    originFrequency: [400.131_882_35],
    fieldStrength: 9.397_691_291_560_301,
    numberOfScans: 8,
    temperature: 300,
    date: '2012-06-02T12:41:55.000Z',
    probeName: '5 mm PABBO BB-1H/D Z-GRD Z104450/0119',
    title: 'Parameter file, TOPSPIN\t\tVersion 2.1',
  });
});

test('metadata of a 2D experiment carries one value per dimension', async () => {
  const entries = await splitNmrZip(archive);
  const jres = entries.find((entry) => entry.meta.experimentNumber === 13);

  expect(jres?.meta.dimension).toBe(2);
  expect(jres?.meta.nucleus).toStrictEqual(['1H', 'Hz']);
  expect(jres?.meta.baseFrequency).toStrictEqual([400.13, 400.13]);
  expect(jres?.meta.pulseSequence).toBe('jresgppsqf.2');
  expect(jres?.meta.experiment).toBe('jres');
  // This one was never processed, so `preferFT` falls back to the FID.
  expect(jres?.meta.isFid).toBe(true);
});

test('each entry is itself a readable single-experiment archive', async () => {
  const entries = await splitNmrZip(archive);
  const first = entries[0];

  const again = await splitNmrZip(first?.zip as Uint8Array);

  expect(again).toHaveLength(1);
  expect(again[0]?.meta).toStrictEqual(first?.meta);
});

test('an entry holds only the files of its own experiment', async () => {
  const entries = await splitNmrZip(archive);

  const files = await FileCollection.fromZip(entries[1]?.zip as Uint8Array);
  const paths = files.files.map((file) => file.relativePath);

  expect(paths).toHaveLength(19);
  expect(paths.every((path) => path.startsWith(`${SAMPLE}/11/`))).toBe(true);
  expect(paths).toContain(`${SAMPLE}/11/acqus`);
  expect(paths).toContain(`${SAMPLE}/11/pdata/1/1r`);
  expect(paths).toContain(`${SAMPLE}/11/fid`);
});

test('dataSelection picks the FID instead of the spectrum', async () => {
  const entries = await splitNmrZip(archive, { dataSelection: 'fid' });

  expect(entries.map((entry) => entry.meta.experimentNumber)).toStrictEqual([
    11, 12, 13, 99999,
  ]);
  expect(entries.every((entry) => entry.meta.isFid)).toBe(true);
});

test('keep2D drops the two-dimensional experiment', async () => {
  const entries = await splitNmrZip(archive, { keep2D: false });

  expect(entries.map((entry) => entry.meta.experimentNumber)).toStrictEqual([
    10, 11, 12, 99999,
  ]);
});

test('keep1D keeps only the two-dimensional experiment', async () => {
  const entries = await splitNmrZip(archive, { keep1D: false });

  expect(entries.map((entry) => entry.meta.experimentNumber)).toStrictEqual([
    13,
  ]);
});

test('experimentNumbers restricts the result', async () => {
  const entries = await splitNmrZip(archive, { experimentNumbers: [11, 12] });

  expect(entries.map((entry) => entry.meta.experimentNumber)).toStrictEqual([
    11, 12,
  ]);
});

test('a single-file spectrum is zipped on its own', async () => {
  const collection = new FileCollection();
  await collection.appendText('spectra/tiny.dx', TINY_JCAMP);

  const entries = await splitNmrZip(await collection.toZip());

  expect(entries).toHaveLength(1);
  expect(entries[0]?.meta.name).toBe('tiny');
  expect(entries[0]?.meta.nucleus).toStrictEqual(['1H']);

  const files = await FileCollection.fromZip(entries[0]?.zip as Uint8Array);

  expect(files.files.map((file) => file.relativePath)).toStrictEqual([
    'spectra/tiny.dx',
  ]);
});

test('an ambiguous single-file spectrum is reported, not guessed', async () => {
  const collection = new FileCollection();
  await collection.appendText('a/tiny.dx', TINY_JCAMP);
  await collection.appendText('b/tiny.jdx', TINY_JCAMP);
  const logger = new FifoLogger();

  const entries = await splitNmrZip(await collection.toZip(), { logger });

  expect(entries).toHaveLength(0);

  const warnings = logger
    .getLogs()
    .filter((log) => log.message.includes('experiment skipped'));

  expect(warnings).toHaveLength(2);
  expect(warnings[0]?.message).toBe(
    'no file matches "tiny", experiment skipped',
  );
});

const TINY_JCAMP = `##TITLE=tiny
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
