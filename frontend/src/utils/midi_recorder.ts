import { RecordedMidiEvent } from '../types';

/**
 * Encodes an integer into a MIDI Variable Length Quantity (VLQ).
 */
function encodeVLQ(value: number): number[] {
  const bytes: number[] = [];
  let v = Math.floor(Math.max(0, value));
  bytes.push(v & 0x7f);
  v >>= 7;

  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

/**
 * Creates a valid Standard MIDI File (SMF Format 0) from an array of recorded events.
 * @param events Recorded events with time_ms, pitch, velocity, and type ('note_on' | 'note_off')
 * @param bpm Beats per minute (default: 120)
 * @returns Uint8Array of binary .mid file data
 */
export function createMidiFile(
  events: RecordedMidiEvent[], 
  title: string = 'Recorded Performance',
  bpm: number = 120
): Uint8Array {
  const ticksPerQuarterNote = 480;
  // Milliseconds per tick: (60,000 ms / bpm) / ticksPerQuarterNote
  const msPerTick = (60000.0 / bpm) / ticksPerQuarterNote;

  // Sort events chronologically
  const sorted = [...events].sort((a, b) => a.time_ms - b.time_ms);

  const trackBytes: number[] = [];

  // 1. Meta Event: Track Name
  const titleBytes = new TextEncoder().encode(title);
  trackBytes.push(0x00, 0xff, 0x03, ...encodeVLQ(titleBytes.length), ...Array.from(titleBytes));

  // 2. Meta Event: Set Tempo (microsec per quarter note)
  const microsecondsPerBeat = Math.round(60000000 / bpm);
  trackBytes.push(
    0x00, 0xff, 0x51, 0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff
  );

  // 3. Note Events
  let lastTimeMs = 0;

  for (const ev of sorted) {
    const deltaMs = Math.max(0, ev.time_ms - lastTimeMs);
    lastTimeMs = ev.time_ms;
    const deltaTicks = Math.round(deltaMs / msPerTick);

    trackBytes.push(...encodeVLQ(deltaTicks));

    const status = ev.type === 'note_on' ? 0x90 : 0x80;
    trackBytes.push(status, ev.pitch & 0x7f, Math.min(127, Math.max(0, ev.velocity)));
  }

  // 4. Meta Event: End of Track
  trackBytes.push(0x00, 0xff, 0x2f, 0x00);

  // 5. Build Header Chunk (14 bytes)
  const header = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Chunk length = 6
    0x00, 0x00,             // Format 0 (single track)
    0x00, 0x01,             // 1 track
    (ticksPerQuarterNote >> 8) & 0xff,
    ticksPerQuarterNote & 0xff
  ];

  // 6. Build Track Chunk Header (8 bytes) + track data
  const trackLength = trackBytes.length;
  const trackChunkHeader = [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    (trackLength >> 24) & 0xff,
    (trackLength >> 16) & 0xff,
    (trackLength >> 8) & 0xff,
    trackLength & 0xff
  ];

  const fullFile = new Uint8Array(header.length + trackChunkHeader.length + trackBytes.length);
  fullFile.set(header, 0);
  fullFile.set(trackChunkHeader, header.length);
  fullFile.set(trackBytes, header.length + trackChunkHeader.length);

  return fullFile;
}

/**
 * Triggers a browser download of a MIDI binary blob as a .mid file.
 */
export function downloadMidiFile(data: Uint8Array, filename: string = 'recording.mid') {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
