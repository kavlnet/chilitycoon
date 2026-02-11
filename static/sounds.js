/**
 * Simple audio feedback using Web Audio API
 * No external files needed - generates tones programmatically
 */

class GameAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.master = null;
        this.compressor = null;
        this.uiBus = null;
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -22;
            this.compressor.knee.value = 18;
            this.compressor.ratio.value = 2.4;
            this.compressor.attack.value = 0.004;
            this.compressor.release.value = 0.2;

            this.master = this.ctx.createGain();
            this.master.gain.value = 0.6;

            this.uiBus = this.ctx.createGain();
            this.uiBus.gain.value = 0.9;

            this.uiBus.connect(this.compressor);
            this.compressor.connect(this.master);
            this.master.connect(this.ctx.destination);
        } catch (e) {
            console.warn('Web Audio not supported');
            this.enabled = false;
        }
    }

    // Play a tone with given frequency, duration, and type
    playTone(freq, duration, type = 'sine', volume = 0.3, attack = 0.005) {
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(volume, now + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.uiBus || this.ctx.destination);

        osc.start();
        osc.stop(now + duration);
    }

    playSlide(fromFreq, toFreq, duration, type = 'triangle', volume = 0.2) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = type;
        osc.frequency.setValueAtTime(fromFreq, now);
        osc.frequency.exponentialRampToValueAtTime(toFreq, now + duration);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.uiBus || this.ctx.destination);

        osc.start();
        osc.stop(now + duration);
    }

    // Click/select sound - short blip
    click() {
        this.playTone(950, 0.045, 'triangle', 0.13, 0.003);
    }

    // Submit confirmation - two quick ascending tones
    submit() {
        this.playTone(520, 0.09, 'square', 0.16, 0.002);
        setTimeout(() => this.playTone(780, 0.12, 'triangle', 0.18, 0.003), 65);
    }

    lockIn() {
        this.playTone(420, 0.08, 'square', 0.13, 0.002);
        setTimeout(() => this.playTone(620, 0.16, 'triangle', 0.14, 0.004), 50);
    }

    resultsReveal() {
        this.playSlide(290, 620, 0.16, 'triangle', 0.12);
        setTimeout(() => this.playTone(760, 0.09, 'square', 0.11), 130);
    }

    // Win sound - triumphant ascending arpeggio
    win() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.18, 'triangle', 0.2), i * 90);
        });
        setTimeout(() => this.playTone(1318, 0.24, 'sine', 0.22), 330);
    }

    // Lose sound - descending tone
    lose() {
        this.playSlide(420, 220, 0.32, 'sawtooth', 0.13);
        setTimeout(() => this.playTone(190, 0.25, 'triangle', 0.11), 190);
    }

    // Timer warning - quick beeps
    timerWarning() {
        this.playTone(860, 0.08, 'square', 0.12);
    }

    // Timer critical - faster beeps
    timerCritical() {
        this.playTone(980, 0.06, 'square', 0.16);
    }

    feedbackPulse(isCritical) {
        if (isCritical) {
            this.playTone(1040, 0.055, 'square', 0.14, 0.001);
        } else {
            this.playTone(740, 0.08, 'triangle', 0.1, 0.002);
        }
    }

    // Countdown beep
    countdownBeep() {
        this.playTone(440, 0.14, 'triangle', 0.2);
    }

    // Go! sound
    countdownGo() {
        this.playTone(880, 0.28, 'triangle', 0.24);
    }

    // Round start whoosh (noise burst)
    roundStart() {
        if (!this.enabled || !this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        source.buffer = buffer;
        gain.gain.value = 0.12;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.uiBus || this.ctx.destination);

        source.start();
    }

    // Points counting up
    pointTick() {
        this.playTone(1200 + Math.random() * 200, 0.03, 'sine', 0.1);
    }
}

// Global instance
const gameAudio = new GameAudio();
