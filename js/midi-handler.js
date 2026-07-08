/**
 * Web MIDI API Handler
 * Manages MIDI device discovery and input parsing.
 */
class MIDIHandler {
  constructor() {
    this.noteOnListeners  = [];
    this.noteOffListeners = [];
    this.midiAccess       = null;
    this.isSupported      = !!navigator.requestMIDIAccess;
    this.deviceName       = 'None';
    this.connected        = false;
  }

  async init() {
    if (!this.isSupported) {
      console.warn('[MIDI] Web MIDI API not supported in this browser.');
      return false;
    }
    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this._connectAll();
      this.midiAccess.onstatechange = () => this._connectAll();
      this.connected = true;
      return true;
    } catch (err) {
      console.warn('[MIDI] Access denied:', err.message);
      return false;
    }
  }

  _connectAll() {
    const inputs = Array.from(this.midiAccess.inputs.values());
    this.deviceName = inputs.length ? inputs[0].name : 'None';
    this.connected  = inputs.length > 0;
    inputs.forEach(port => {
      port.onmidimessage = msg => this._parse(msg);
    });
    this._updateStatusBar();
  }

  _parse(msg) {
    if (msg.data.length < 3) return;
    const [status, note, velocity] = msg.data;
    const command = status & 0xf0;

    if (command === 0x90 && velocity > 0) {
      this.noteOnListeners.forEach(cb => cb(note, velocity));
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      this.noteOffListeners.forEach(cb => cb(note));
    }
  }

  _updateStatusBar() {
    const bar = document.getElementById('midi-status-bar');
    if (!bar) return;
    const dot = bar.querySelector('.dot');
    const lbl = bar.querySelector('.midi-label');
    if (this.connected) {
      dot.className = 'dot dot-connected';
      lbl.textContent = 'MIDI: ' + this.deviceName;
    } else {
      dot.className = 'dot dot-disconnected';
      lbl.textContent = 'MIDI: not connected';
    }
  }

  onNoteOn (cb) { this.noteOnListeners.push(cb); }
  onNoteOff(cb) { this.noteOffListeners.push(cb); }

  /** Programmatically fire a note-on (used by keyboard fallback). */
  fireNoteOn (note, vel = 100) { this.noteOnListeners.forEach(cb => cb(note, vel)); }
  fireNoteOff(note)            { this.noteOffListeners.forEach(cb => cb(note)); }
}
