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
    this.outputPort       = null;
    this.outputEnabled    = false;
    this.outputName       = 'None';
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

    const outBtn = document.getElementById('midi-output-btn');
    if (outBtn) {
      outBtn.addEventListener('click', () => {
        this.outputEnabled = !this.outputEnabled;
        this._updateOutputButton();
      });
    }
  }

  sendNoteOn(note, velocity = 100, channel = 0) {
    if (!this.outputEnabled || !this.outputPort) return;
    this.outputPort.send([0x90 | (channel & 0x0F), note & 0x7F, velocity & 0x7F]);
  }

  sendNoteOff(note, channel = 0) {
    if (!this.outputEnabled || !this.outputPort) return;
    this.outputPort.send([0x80 | (channel & 0x0F), note & 0x7F, 0x40]);
  }

  _updateOutputButton() {
    const btn = document.getElementById('midi-output-btn');
    if (!btn) return;
    if (!this.outputPort) {
      btn.textContent = 'OUT';
      btn.title = 'No MIDI output device';
      btn.setAttribute('aria-label', 'No MIDI output device');
      return;
    }
    btn.textContent = this.outputEnabled ? 'OUT ✓' : 'OUT';
    const status = this.outputEnabled
      ? `MIDI out ON: ${this.outputName}`
      : `MIDI out OFF — click to route to ${this.outputName}`;
    btn.title = status;
    btn.setAttribute('aria-label', status);
  }

  _connectAll() {
    const inputs = Array.from(this.midiAccess.inputs.values());
    this.deviceName = inputs.length ? inputs[0].name : 'None';
    this.connected  = inputs.length > 0;
    inputs.forEach(port => {
      port.onmidimessage = msg => this._parse(msg);
    });

    const outputs = Array.from(this.midiAccess.outputs.values());
    this.outputPort = outputs.length ? outputs[0] : null;
    this.outputName = this.outputPort ? this.outputPort.name : 'None';

    this._updateStatusButton();
    this._updateOutputButton();
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
