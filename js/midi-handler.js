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
      this._updateStatusButton();
      return false;
    }
    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.midiAccess.onstatechange = () => this._connectAll();
      this._connectAll();
      return true;
    } catch (err) {
      console.warn('[MIDI] Access denied:', err.message);
      this.connected = false;
      this._updateStatusButton();
      return false;
    }
  }

  bindStatusButton() {
    const btn = document.getElementById('midi-status-btn');
    if (!btn) return;
    btn.addEventListener('click', () => this.init());
  }

  _connectAll() {
    const inputs = Array.from(this.midiAccess.inputs.values());
    this.deviceName = inputs.length ? inputs[0].name : 'None';
    this.connected  = inputs.length > 0;
    inputs.forEach(port => {
      port.onmidimessage = msg => this._parse(msg);
    });
    this._updateStatusButton();
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

  _updateStatusButton() {
    const btn = document.getElementById('midi-status-btn');
    if (!btn) return;
    const dot = btn.querySelector('.dot');
    const lbl = btn.querySelector('.midi-label');
    if (this.connected) {
      dot.className = 'dot dot-connected';
      lbl.textContent = 'MIDI';
      const status = `MIDI: ${this.deviceName}`;
      btn.title = status;
      btn.setAttribute('aria-label', status);
    } else if (!this.isSupported) {
      dot.className = 'dot dot-disconnected';
      lbl.textContent = 'MIDI';
      btn.title = 'MIDI not supported in this browser';
      btn.setAttribute('aria-label', 'MIDI not supported in this browser');
    } else {
      dot.className = 'dot dot-disconnected';
      lbl.textContent = 'MIDI';
      btn.title = 'MIDI: not connected — click to connect';
      btn.setAttribute('aria-label', 'MIDI: not connected — click to connect');
    }
  }

  onNoteOn (cb) { this.noteOnListeners.push(cb); }
  onNoteOff(cb) { this.noteOffListeners.push(cb); }

  /** Programmatically fire a note-on (used by keyboard fallback). */
  fireNoteOn (note, vel = 100) { this.noteOnListeners.forEach(cb => cb(note, vel)); }
  fireNoteOff(note)            { this.noteOffListeners.forEach(cb => cb(note)); }
}
