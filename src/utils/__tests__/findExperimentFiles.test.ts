import { FileCollection } from 'file-collection';
import { expect, test } from 'vitest';

import { findExperimentFiles } from '../findExperimentFiles.ts';

test('selects every file below the experiment directory', async () => {
  const collection = new FileCollection();
  await collection.appendText('sample/10/acqus', 'a');
  await collection.appendText('sample/10/pdata/1/1r', 'b');
  await collection.appendText('sample/11/acqus', 'c');

  const files = findExperimentFiles(collection, 'sample/10');

  expect(files?.files.map((file) => file.relativePath)).toStrictEqual([
    'sample/10/acqus',
    'sample/10/pdata/1/1r',
  ]);
});

test('selects a single file by its name without extension', async () => {
  const collection = new FileCollection();
  await collection.appendText('spectra/one.jdx', 'a');
  await collection.appendText('spectra/two.jdx', 'b');

  const files = findExperimentFiles(collection, 'two');

  expect(files?.files.map((file) => file.relativePath)).toStrictEqual([
    'spectra/two.jdx',
  ]);
});

test('matches a file that has no extension', async () => {
  const collection = new FileCollection();
  await collection.appendText('spectra/noext', 'a');

  const files = findExperimentFiles(collection, 'noext');

  expect(files?.files.map((file) => file.relativePath)).toStrictEqual([
    'spectra/noext',
  ]);
});

test('an unnamed experiment takes the whole collection', async () => {
  const collection = new FileCollection();
  await collection.appendText('acqus', 'a');
  await collection.appendText('pdata/1/1r', 'b');

  const files = findExperimentFiles(collection, '');

  expect(files?.files.map((file) => file.relativePath)).toStrictEqual([
    'acqus',
    'pdata/1/1r',
  ]);
});

test('an unnamed experiment in an empty collection is null', () => {
  expect(findExperimentFiles(new FileCollection(), '')).toBeNull();
});

test('returns null when the name matches nothing', async () => {
  const collection = new FileCollection();
  await collection.appendText('sample/10/acqus', 'a');

  expect(findExperimentFiles(collection, 'absent')).toBeNull();
});

test('returns null rather than guessing between two matches', async () => {
  const collection = new FileCollection();
  await collection.appendText('a/same.dx', 'a');
  await collection.appendText('b/same.jdx', 'b');

  expect(findExperimentFiles(collection, 'same')).toBeNull();
});
