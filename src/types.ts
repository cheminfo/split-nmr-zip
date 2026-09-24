import type { Logger } from 'cheminfo-types';

/**
 * Which data of an experiment the metadata is read from. An experiment that
 * holds both a FID and a processed spectrum would otherwise yield two results.
 */
export type DataSelection = 'ft' | 'fid' | 'preferFT' | 'preferFID';

export interface SplitNmrZipOptions {
  /**
   * Which data of each experiment to describe: the processed spectrum (`ft`),
   * the raw FID (`fid`), or either with a fallback to the other.
   * @default 'preferFT'
   */
  dataSelection?: DataSelection;
  /**
   * Keep one-dimensional experiments.
   * @default true
   */
  keep1D?: boolean;
  /**
   * Keep two-dimensional experiments.
   * @default true
   */
  keep2D?: boolean;
  /**
   * Restrict the result to these Bruker experiment numbers (expno).
   * @default all the experiments in the archive
   */
  experimentNumbers?: number[];
  /**
   * Reports the experiments that were skipped because they hold no readable
   * data, and anything the underlying readers warn about.
   * @default undefined
   */
  logger?: Logger;
}

/**
 * Acquisition parameters of one experiment, normalised from the raw parameter
 * files. Values absent from the source are left `undefined` rather than
 * guessed. Per-dimension values are always arrays: one entry in 1D, two in 2D.
 */
export interface NmrExperimentMeta {
  /** Path of the experiment inside the archive, for example `coffee/10`. */
  name: string;
  /** Bruker experiment number, the `expno` directory the data comes from. */
  experimentNumber?: number;
  /** Observed nucleus per dimension, for example `['1H']` or `['1H', '13C']`. */
  nucleus: string[];
  /** Number of dimensions of the experiment. */
  dimension: number;
  /** `true` when the metadata describes the FID rather than the spectrum. */
  isFid: boolean;
  /** Solvent as the operator entered it, so not necessarily a known solvent. */
  solvent?: string;
  /** Name of the pulse program, for example `zg30`. */
  pulseSequence?: string;
  /** Experiment kind derived from the pulse program, for example `1d`, `cosy`. */
  experiment?: string;
  /** Spectrometer reference frequency per dimension, in MHz. */
  baseFrequency: number[];
  /** Irradiation frequency per dimension, in MHz. */
  originFrequency: number[];
  /** Magnetic field strength, in tesla. */
  fieldStrength?: number;
  /** Number of accumulated scans. */
  numberOfScans?: number;
  /** Sample temperature, in kelvin. */
  temperature?: number;
  /** Acquisition date, as an ISO 8601 string. */
  date?: string;
  /** Probe the spectrum was recorded with. */
  probeName?: string;
  /** Title the operator gave the experiment. */
  title?: string;
}

/** One experiment of the source archive, as a standalone zip. */
export interface NmrZipEntry {
  /**
   * The files of this experiment alone, zipped. Paths are the ones the source
   * archive used, so the result is itself a readable Bruker archive.
   */
  zip: Uint8Array;
  /** Acquisition parameters read from the experiment's parameter files. */
  meta: NmrExperimentMeta;
}
