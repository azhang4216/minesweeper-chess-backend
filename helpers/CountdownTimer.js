class CountdownTimer {
    constructor(durationSeconds, onTimeout) {
        this.totalDuration = durationSeconds;
        this.remaining = durationSeconds;
        this.isPaused = false;
        this.intervalId = null;
        this.startTime = null;
        this.onTimeout = onTimeout;
    }

    start() {
        if (this.intervalId) return; // Already running

        const durationToUse = this.isPaused ? this.remaining : this.totalDuration;
        this.startTime = Date.now();
        this.isPaused = false;

        this.intervalId = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.remaining = durationToUse - elapsed;

            if (this.remaining <= 0) {
                this.stop();
                if (this.onTimeout) this.onTimeout();
            }
        }, 200);
    }

    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isPaused = false;
    }

    pause() {
        if (this.isPaused || !this.intervalId) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.remaining = this.totalDuration - elapsed;
        this.isPaused = true;
    }

    getTimeLeft() {
        return this.remaining;
    }
}

export default CountdownTimer;