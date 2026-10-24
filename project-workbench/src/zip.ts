import type { ProjectFile } from './project-export';

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

/** Standard uncompressed ZIP entries keep export local, deterministic, and dependency free. */
export const zipProject = (files: readonly ProjectFile[]): Uint8Array<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const paths = new Set<string>();
  const entries = files.map((file) => {
    if (
      !file.path ||
      file.path.startsWith('/') ||
      file.path.includes('\\') ||
      file.path.split('/').includes('..') ||
      paths.has(file.path)
    ) {
      throw new TypeError('ZIP entries need unique relative file paths.');
    }

    paths.add(file.path);
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.source);
    let crc = 0xffffffff;

    for (const byte of data) {
      crc = crcTable[(crc ^ byte) & 255]! ^ (crc >>> 8);
    }

    return { name, data, crc: (crc ^ 0xffffffff) >>> 0 };
  });
  const localSize = entries.reduce(
    (size, entry) => size + 30 + entry.name.length + entry.data.length,
    0,
  );
  const centralSize = entries.reduce((size, entry) => size + 46 + entry.name.length, 0);
  const bytes = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  const offsets: number[] = [];

  for (const entry of entries) {
    offsets.push(offset);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 0x800, true);
    view.setUint16(offset + 12, 0x21, true);
    view.setUint32(offset + 14, entry.crc, true);
    view.setUint32(offset + 18, entry.data.length, true);
    view.setUint32(offset + 22, entry.data.length, true);
    view.setUint16(offset + 26, entry.name.length, true);
    bytes.set(entry.name, offset + 30);
    bytes.set(entry.data, offset + 30 + entry.name.length);
    offset += 30 + entry.name.length + entry.data.length;
  }

  entries.forEach((entry, index) => {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, 0x800, true);
    view.setUint16(offset + 14, 0x21, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.data.length, true);
    view.setUint32(offset + 24, entry.data.length, true);
    view.setUint16(offset + 28, entry.name.length, true);
    view.setUint32(offset + 42, offsets[index]!, true);
    bytes.set(entry.name, offset + 46);
    offset += 46 + entry.name.length;
  });
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, centralSize, true);
  view.setUint32(offset + 16, localSize, true);
  return bytes;
};
