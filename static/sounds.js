/**
 * Simple audio feedback using Web Audio API
 * No external files needed - generates tones programmatically
 */

class GameAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio not supported');
            this.enabled = false;
        }
    }

    // Play a tone with given frequency, duration, and type
    playTone(freq, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // Click/select sound - short blip
    click() {
        this.playTone(800, 0.05, 'sine', 0.2);
    }

    // Submit confirmation - two quick ascending tones
    submit() {
        this.playTone(600, 0.08, 'sine', 0.25);
        setTimeout(() => this.playTone(900, 0.1, 'sine', 0.25), 80);
    }

    // Win sound - triumphant ascending arpeggio
    win() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.3), i * 100);
        });
    }

    // Lose sound - descending tone
    lose() {
        this.playTone(400, 0.3, 'triangle', 0.2);
        setTimeout(() => this.playTone(300, 0.4, 'triangle', 0.15), 150);
    }

    // Timer warning - quick beeps
    timerWarning() {
        this.playTone(880, 0.08, 'square', 0.15);
    }

    // Timer critical - faster beeps
    timerCritical() {
        this.playTone(988, 0.06, 'square', 0.2);
    }

    // Countdown beep
    countdownBeep() {
        this.playTone(440, 0.15, 'sine', 0.3);
    }

    // Go! sound
    countdownGo() {
        this.playTone(880, 0.3, 'sine', 0.4);
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
        gain.gain.value = 0.15;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        source.start();
    }

    // Points counting up
    pointTick() {
        this.playTone(1200 + Math.random() * 200, 0.03, 'sine', 0.1);
    }
}

// Global instance
const gameAudio = new GameAudio();
