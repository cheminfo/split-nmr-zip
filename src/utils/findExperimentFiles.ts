import type { FileCollection } from 'file-collection';

/**
 * Select the files of one experiment out of the whole archive.
 *
 * Bruker stores an experiment in its own directory, and the reader names the
 * spectrum after that directory, so the files are the ones below it. The
 * directory can be at any depth, and a nested zip counts as one, because the
 * archive is expanded before this runs. A format that holds a whole experiment
 * in a single file is named after that file instead, without its extension.
 *
 * An archive whose parameter files sit at its very root — someone zipped the
 * contents of an `expno` rather than the directory — leaves the reader with no
 * name at all, and then every file belongs to the one experiment.
 * @param collection - Every file of the archive.
 * @param name - `info.name` of the spectrum, as the reader set it.
 * @returns The files of that experiment, or `null` when the name matches no
 *   file, or matches several and picking one would be a guess.
 */
export function findExperimentFiles(
  collection: FileCollection,
  name: string,
): FileCollection | null {
  if (!name) return collection.files.length > 0 ? collection : null;

  const directory = `${name}/`;
  const inDirectory = collection.filter((file) =>
    file.relativePath.startsWith(directory),
  );
  if (inDirectory.files.length > 0) return inDirectory;

  const matches = collection.files.filter(
    (file) => withoutExtension(file.relativePath) === name,
  );
  const only = matches.length === 1 ? matches[0] : undefined;
  if (!only) return null;
  return collection.filter((file) => file === only);
}

function withoutExtension(relativePath: string): string {
  const base = relativePath.slice(relativePath.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot === -1 ? base : base.slice(0, dot);
}
