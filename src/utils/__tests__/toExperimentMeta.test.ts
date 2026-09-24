import { expect, test } from 'vitest';

import { toExperimentMeta } from '../toExperimentMeta.ts';

test('widens the scalars of a 1D experiment to arrays', () => {
  const meta = toExperimentMeta({
    name: 'sample/10',
    experimentNumber: 10,
    nucleus: '1H',
    dimension: 1,
    isFid: false,
    baseFrequency: 400.13,
    originFrequency: 400.131_882_35,
  });

  expect(meta.nucleus).toStrictEqual(['1H']);
  expect(meta.baseFrequency).toStrictEqual([400.13]);
  expect(meta.originFrequency).toStrictEqual([400.131_882_35]);
});

test('keeps the per-dimension arrays of a 2D experiment', () => {
  const meta = toExperimentMeta({
    name: 'sample/13',
    dimension: 2,
    nucleus: ['1H', '13C'],
    baseFrequency: [400.13, 100.61],
    originFrequency: [400.13, 100.61],
  });

  expect(meta.nucleus).toStrictEqual(['1H', '13C']);
  expect(meta.baseFrequency).toStrictEqual([400.13, 100.61]);
});

test('a missing per-dimension value becomes an empty array', () => {
  const meta = toExperimentMeta({ name: 'sample/1', dimension: 1 });

  expect(meta.nucleus).toStrictEqual([]);
  expect(meta.baseFrequency).toStrictEqual([]);
  expect(meta.originFrequency).toStrictEqual([]);
});

test('isFid is always a boolean, and the rest is carried over', () => {
  const meta = toExperimentMeta({
    name: 'sample/10',
    dimension: 1,
    solvent: 'CDCl3',
    pulseSequence: 'zg30',
    experiment: '1d',
    numberOfScans: 16,
    temperature: 298,
  });

  expect(meta.isFid).toBe(false);
  expect(meta.solvent).toBe('CDCl3');
  expect(meta.pulseSequence).toBe('zg30');
  expect(meta.experiment).toBe('1d');
  expect(meta.numberOfScans).toBe(16);
  expect(meta.temperature).toBe(298);
});
