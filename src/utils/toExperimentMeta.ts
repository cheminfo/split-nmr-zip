import type { NmrExperimentMeta } from '../types.ts';

/**
 * The part of a spectrum's `info` this reads. The reader fills more fields
 * than its published type declares, so they are restated here, all optional
 * because a parameter absent from the source file stays absent.
 */
export interface SpectrumInfoLike {
  name: string;
  dimension: number;
  experimentNumber?: number;
  nucleus?: string | string[];
  isFid?: boolean;
  solvent?: string;
  pulseSequence?: string;
  experiment?: string;
  baseFrequency?: number | number[];
  originFrequency?: number | number[];
  fieldStrength?: number;
  numberOfScans?: number;
  temperature?: number;
  date?: string;
  probeName?: string;
  title?: string;
}

/**
 * Normalise the `info` of a spectrum into the metadata of one experiment.
 *
 * The reader returns a scalar for a 1D experiment and an array for a 2D one on
 * every per-dimension value, so those are widened to arrays here and the
 * consumer never has to test which it got.
 * @param info - The `info` object of a spectrum read by the NMRium core.
 * @returns The acquisition parameters of the experiment.
 */
export function toExperimentMeta(info: SpectrumInfoLike): NmrExperimentMeta {
  return {
    name: info.name,
    experimentNumber: info.experimentNumber ?? experimentNumberOf(info.name),
    nucleus: toArray(info.nucleus),
    dimension: info.dimension,
    isFid: Boolean(info.isFid),
    solvent: info.solvent,
    pulseSequence: info.pulseSequence,
    experiment: info.experiment,
    baseFrequency: toArray(info.baseFrequency),
    originFrequency: toArray(info.originFrequency),
    fieldStrength: info.fieldStrength,
    numberOfScans: info.numberOfScans,
    temperature: info.temperature,
    date: info.date,
    probeName: info.probeName,
    title: info.title,
  };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * The reader parses the `expno` out of the directory name, which it cannot do
 * when the experiment arrived as its own zip: `Number('10.zip')` is `NaN`. The
 * number is still there to be read, so take it, and only when the whole name
 * is that number.
 * @param name - `info.name` of the spectrum.
 * @returns The experiment number, or `undefined` when the name holds none.
 */
function experimentNumberOf(name: string | undefined): number | undefined {
  if (!name) return undefined;
  const segment = name.slice(name.lastIndexOf('/') + 1);
  const withoutExtension = segment.replace(/\.[^.]+$/, '');
  return /^\d+$/.test(withoutExtension) ? Number(withoutExtension) : undefined;
}
