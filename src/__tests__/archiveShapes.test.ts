import { FileCollection } from 'file-collection';
import { beforeAll, expect, test } from 'vitest';

import { splitNmrZip } from '../index.ts';

import type { ArchiveFile } from './helpers/coffeeArchive.ts';
import { SAMPLE, coffeeFiles, zipFiles } from './helpers/coffeeArchive.ts';

// Two experiments are enough to tell "one entry per experiment" from "one
// entry for the archive", and keep every case below fast.
let files: ArchiveFile[];

beforeAll(async () => {
  files = await coffeeFiles(['10', '11']);
});

test('the experiment directories are at the root of the archive', async () => {
  const entries = await splitNmrZip(await zipFiles(files));

  expect(entries.map((entry) => entry.meta.name)).toStrictEqual(['10', '11']);
  expect(entries.map((entry) => entry.meta.experimentNumber)).toStrictEqual([
    10, 11,
  ]);
});

test('the experiment directories are nested under several parents', async () => {
  const entries = await splitNmrZip(
    await zipFiles(files, (path) => `ab/cd/${path}`),
  );

  expect(entries.map((entry) => entry.meta.name)).toStrictEqual([
    'ab/cd/10',
    'ab/cd/11',
  ]);
  expect(entries.map((entry) => entry.meta.experimentNumber)).toStrictEqual([
    10, 11,
  ]);
  expect(entries[0]?.meta.pulseSequence).toBe('zg30');
});

test('the depth of the parents does not matter', async () => {
  const entries = await splitNmrZip(
    await zipFiles(files, (path) => `a/b/c/d/e/${path}`),
  );

  expect(entries.map((entry) => entry.meta.name)).toStrictEqual([
    'a/b/c/d/e/10',
    'a/b/c/d/e/11',
  ]);
  expect(entries.map((entry) => entry.meta.experimentNumber)).toStrictEqual([
    10, 11,
  ]);
});

test('the archive holds one zip per experiment', async () => {
  // What you get when each expno was archived on its own: 10.zip, 11.zip.
  const [ten, eleven] = await Promise.all(
    ['10', '11'].map((expno) =>
      zipFiles(
        files.filter((file) => file.path.startsWith(`${expno}/`)),
        (path) => path.slice(expno.length + 1),
      ),
    ),
  );
  const outer = new FileCollection();
  await outer.appendArrayBuffer('10.zip', ten as Uint8Array);
  await outer.appendArrayBuffer('11.zip', eleven as Uint8Array);

  const entries = await splitNmrZip(await outer.toZip());

  expect(entries.map((entry) => entry.meta.name)).toStrictEqual([
    '10.zip',
    '11.zip',
  ]);
  // The reader cannot parse `Number('10.zip')`, the expno is recovered here.
  expect(entries.map((entry) => entry.meta.experimentNumber)).toStrictEqual([
    10, 11,
  ]);
  expect(entries.map((entry) => entry.meta.pulseSequence)).toStrictEqual([
    'zg30',
    'zgpsd0',
  ]);
});

test('the parameter files are at the root, with no experiment directory', async () => {
  // Someone zipped the contents of an expno rather than the directory.
  const oneExperiment = files.filter((file) => file.path.startsWith('10/'));
  const archive = await zipFiles(oneExperiment, (path) =>
    path.slice('10/'.length),
  );

  const entries = await splitNmrZip(archive);

  expect(entries).toHaveLength(1);
  expect(entries[0]?.meta.name).toBe('');
  // There is no directory left to read an expno from, so there is none.
  expect(entries[0]?.meta.experimentNumber).toBeUndefined();
  expect(entries[0]?.meta.pulseSequence).toBe('zg30');
  expect(entries[0]?.meta.solvent).toBe('COFFEE_calctemp');

  const back = await FileCollection.fromZip(entries[0]?.zip as Uint8Array);

  expect(back.files.map((file) => file.relativePath)).toContain('acqus');
});

test('a sample directory keeps its experiments apart', async () => {
  const entries = await splitNmrZip(
    await zipFiles(files, (path) => `${SAMPLE}/${path}`),
  );

  expect(entries.map((entry) => entry.meta.name)).toStrictEqual([
    `${SAMPLE}/10`,
    `${SAMPLE}/11`,
  ]);
});
