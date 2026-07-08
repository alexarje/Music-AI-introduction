/**
 * Minimal Type-0 MIDI file encoder (Issue #14)
 */
class MidiExport {
  static encode(events, bpm = 120) {
    const tpq = 480;
    const usPerQ = Math.round(60000000 / bpm);

    const trackEvents = [];
    trackEvents.push(...MidiExport._varLen(0), 0xFF, 0x51, 0x03,
      (usPerQ >> 16) & 0xFF, (usPerQ >> 8) & 0xFF, usPerQ & 0xFF);
    trackEvents.push(...MidiExport._varLen(0), 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

    const sorted = [...events].sort((a, b) => a.tick - b.tick);
    let lastTick = 0;
    sorted.forEach((ev) => {
      const delta = ev.tick - lastTick;
      lastTick = ev.tick;
      if (ev.type === 'on') {
        trackEvents.push(...MidiExport._varLen(delta), 0x90, ev.note & 0x7F, ev.velocity & 0x7F);
      } else {
        trackEvents.push(...MidiExport._varLen(delta), 0x80, ev.note & 0x7F, 0x40);
      }
    });
    trackEvents.push(...MidiExport._varLen(0), 0xFF, 0x2F, 0x00);

    const trackLen = trackEvents.length;
    const header = [
      0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
      0x00, 0x00, 0x00, 0x01, (tpq >> 8) & 0xFF, tpq & 0xFF,
      0x4D, 0x54, 0x72, 0x6B,
      (trackLen >> 24) & 0xFF, (trackLen >> 16) & 0xFF, (trackLen >> 8) & 0xFF, trackLen & 0xFF
    ];

    return new Uint8Array([...header, ...trackEvents]);
  }

  static notesToEvents(notes, noteLenSec = 0.3, bpm = 120) {
    const tpq = 480;
    const ticksPerNote = Math.round((noteLenSec * bpm / 60) * tpq);
    const events = [];
    notes.forEach((note, i) => {
      if (note < 0) return;
      const tick = i * ticksPerNote;
      events.push({ type: 'on', note, velocity: 90, tick });
      events.push({ type: 'off', note, tick: tick + ticksPerNote - 1 });
    });
    return events;
  }

  static download(filename, notes, noteLenSec = 0.3, bpm = 120) {
    const events = MidiExport.notesToEvents(notes, noteLenSec, bpm);
    const bytes = MidiExport.encode(events, bpm);
    MidiExport._saveBlob(filename, bytes);
  }

  static downloadDual(filename, lower, upper, noteLenSec = 0.3, bpm = 120) {
    const tpq = 480;
    const ticksPerNote = Math.round((noteLenSec * bpm / 60) * tpq);
    const events = [];
    const len = Math.max(lower.length, upper.length);
    for (let i = 0; i < len; i++) {
      const tick = i * ticksPerNote;
      if (lower[i] != null) {
        events.push({ type: 'on', note: lower[i], velocity: 90, tick });
        events.push({ type: 'off', note: lower[i], tick: tick + ticksPerNote - 1 });
      }
      if (upper[i] != null) {
        events.push({ type: 'on', note: upper[i], velocity: 75, tick });
        events.push({ type: 'off', note: upper[i], tick: tick + ticksPerNote - 1 });
      }
    }
    MidiExport._saveBlob(filename, MidiExport.encode(events, bpm));
  }

  static _saveBlob(filename, bytes) {
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  static _varLen(value) {
    const buffer = value & 0x7F;
    const bytes = [];
    let v = value >> 7;
    while (v > 0) {
      bytes.unshift((v & 0x7F) | 0x80);
      v >>= 7;
    }
    bytes.push(buffer);
    return bytes;
  }
}
