/**
 * SoundManager - Audio orchestration singleton
 * Phase 2.0.3 - Audio Config
 * Phase 5 - Migrated from expo-av to expo-audio (SDK 54)
 *
 * Handles ambient background sounds and UI feedback sounds
 * for the cinematic onboarding experience.
 */

import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import type { OnboardingAct } from '../types/atmosphere.types';

// Audio asset paths (placeholders - actual files to be added later)
// To add audio files:
// 1. Create src/assets/audio/ directory
// 2. Add .mp3 files for each Act's ambient track
// 3. Uncomment the require() statements below
const AMBIENT_TRACKS: Record<OnboardingAct, number | null> = {
  act1: null, // require('../assets/audio/ambient_calm.mp3')
  act2: null, // require('../assets/audio/ambient_tension.mp3')
  act3: null, // require('../assets/audio/ambient_hope.mp3')
};

const UI_SOUNDS: Record<string, number | null> = {
  tap: null,        // Short click sound
  slide: null,      // Slider movement
  success: null,    // Achievement sound
  transition: null, // Screen change whoosh
  toast: null,      // Toast popup sound
};

// Shepard Tone audio files for penalty slider (Phase 2.2.1)
// To add Shepard tone files:
// 1. Generate looping Shepard tone audio files at different intensities
// 2. Add to src/assets/audio/
// 3. Uncomment the require() statements below
const SHEPARD_TONES: Record<string, number | null> = {
  low: null,    // require('../assets/audio/shepard_tone_low.mp3')
  mid: null,    // require('../assets/audio/shepard_tone_mid.mp3')
  high: null,   // require('../assets/audio/shepard_tone_high.mp3')
};

class SoundManagerClass {
  private currentAmbient: AudioPlayer | null = null;
  private uiSounds: Map<string, AudioPlayer> = new Map();
  private shepardSounds: Map<string, AudioPlayer> = new Map();
  private isInitialized = false;
  private isMuted = false;
  private ambientVolume = 0.3;
  private uiVolume = 0.5;
  private shepardVolume = 0.25;
  private isShepardPlaying = false;

  /**
   * Initialize audio system and preload sounds
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true, // Cinematic experience: play audio even in silent mode
        interruptionMode: 'duckOthers',
      });

      // Preload UI sounds (when audio files are added)
      await this.preloadUISounds();

      this.isInitialized = true;
      console.log('[SoundManager] Initialized successfully');
    } catch (error) {
      console.warn('[SoundManager] Initialization failed:', error);
    }
  }

  /**
   * Preload UI sounds for instant playback
   */
  private async preloadUISounds(): Promise<void> {
    for (const [name, source] of Object.entries(UI_SOUNDS)) {
      if (source !== null) {
        try {
          const player = createAudioPlayer(source);
          player.volume = this.uiVolume;
          this.uiSounds.set(name, player);
        } catch (error) {
          console.warn(`[SoundManager] Failed to load UI sound: ${name}`, error);
        }
      }
    }
  }

  /**
   * Crossfade to a new Act's ambient track
   * @param act - Target Act
   * @param duration - Crossfade duration in ms (default: 1000)
   */
  async crossfadeToAct(act: OnboardingAct, duration: number = 1000): Promise<void> {
    if (!this.isInitialized || this.isMuted) return;

    const trackSource = AMBIENT_TRACKS[act];
    if (trackSource === null) {
      // No audio file for this act yet - just fade out current
      if (this.currentAmbient) {
        await this.fadeOut(this.currentAmbient, duration);
        this.currentAmbient.release();
        this.currentAmbient = null;
      }
      return;
    }

    try {
      // Fade out current ambient
      if (this.currentAmbient) {
        await this.fadeOut(this.currentAmbient, duration / 2);
        this.currentAmbient.release();
      }

      // Create and fade in new ambient
      const player = createAudioPlayer(trackSource);
      player.loop = true;
      player.volume = 0;

      this.currentAmbient = player;
      player.play();
      await this.fadeIn(player, this.ambientVolume, duration / 2);
    } catch (error) {
      console.warn(`[SoundManager] Crossfade failed for ${act}:`, error);
    }
  }

  /**
   * Play a UI feedback sound
   * @param soundName - Name of the sound to play
   */
  async playUISound(soundName: keyof typeof UI_SOUNDS): Promise<void> {
    if (!this.isInitialized || this.isMuted) return;

    const player = this.uiSounds.get(soundName);
    if (player) {
      try {
        player.seekTo(0);
        player.play();
      } catch (error) {
        console.warn(`[SoundManager] Failed to play UI sound: ${soundName}`, error);
      }
    }
  }

  /**
   * Stop all audio playback
   */
  async stopAll(): Promise<void> {
    if (this.currentAmbient) {
      this.currentAmbient.pause();
    }
    await this.stopShepardTone();
  }

  // ============================================
  // SHEPARD TONE (Phase 2.2.1)
  // ============================================

  /**
   * Play Shepard tone based on intensity (0-1)
   * Placeholder implementation - actual audio files to be added later
   * @param intensity - Value from 0 (low) to 1 (high)
   */
  async playShepardTone(intensity: number): Promise<void> {
    if (!this.isInitialized || this.isMuted) return;

    // Clamp intensity between 0 and 1
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    // Determine which tone to play based on intensity
    let toneName: string;
    if (clampedIntensity < 0.33) {
      toneName = 'low';
    } else if (clampedIntensity < 0.66) {
      toneName = 'mid';
    } else {
      toneName = 'high';
    }

    const toneSource = SHEPARD_TONES[toneName];
    if (toneSource === null) {
      // Placeholder: No audio file yet
      // When audio files are added, this will load and play the appropriate tone
      console.log(`[SoundManager] Shepard tone placeholder: ${toneName} (intensity: ${clampedIntensity.toFixed(2)})`);
      return;
    }

    // Future implementation: Load and play tone with volume mapped to intensity
    try {
      const player = this.shepardSounds.get(toneName);
      if (player) {
        const volume = this.shepardVolume * (0.5 + clampedIntensity * 0.5);
        player.volume = volume;
        if (!this.isShepardPlaying) {
          player.play();
          this.isShepardPlaying = true;
        }
      }
    } catch (error) {
      console.warn('[SoundManager] Failed to play Shepard tone:', error);
    }
  }

  /**
   * Stop Shepard tone playback
   */
  async stopShepardTone(): Promise<void> {
    if (!this.isShepardPlaying) return;

    try {
      for (const player of this.shepardSounds.values()) {
        player.pause();
      }
      this.isShepardPlaying = false;
      console.log('[SoundManager] Shepard tone stopped');
    } catch (error) {
      console.warn('[SoundManager] Failed to stop Shepard tone:', error);
    }
  }

  /**
   * Update Shepard tone intensity without restarting
   * @param intensity - Value from 0 (low) to 1 (high)
   */
  async updateShepardIntensity(intensity: number): Promise<void> {
    if (!this.isInitialized || this.isMuted || !this.isShepardPlaying) return;

    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    // Placeholder: Volume adjustment based on intensity
    // When implemented, this will crossfade between different tone files
    // or adjust playback parameters
    const targetVolume = this.shepardVolume * (0.5 + clampedIntensity * 0.5);

    try {
      for (const player of this.shepardSounds.values()) {
        player.volume = targetVolume;
      }
    } catch (error) {
      console.warn('[SoundManager] Failed to update Shepard intensity:', error);
    }
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.currentAmbient) {
      this.currentAmbient.volume = 0;
    } else if (!muted && this.currentAmbient) {
      this.currentAmbient.volume = this.ambientVolume;
    }
  }

  /**
   * Check if audio is muted
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Cleanup all audio resources
   */
  async cleanup(): Promise<void> {
    if (this.currentAmbient) {
      this.currentAmbient.release();
      this.currentAmbient = null;
    }

    for (const player of this.uiSounds.values()) {
      player.release();
    }
    this.uiSounds.clear();

    for (const player of this.shepardSounds.values()) {
      player.release();
    }
    this.shepardSounds.clear();

    this.isInitialized = false;
    console.log('[SoundManager] Cleanup complete');
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Fade in a player over duration
   */
  private async fadeIn(
    player: AudioPlayer,
    targetVolume: number,
    duration: number
  ): Promise<void> {
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;

    for (let i = 1; i <= steps; i++) {
      player.volume = volumeStep * i;
      await this.delay(stepDuration);
    }
  }

  /**
   * Fade out a player over duration
   */
  private async fadeOut(player: AudioPlayer, duration: number): Promise<void> {
    const currentVolume = player.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = currentVolume / steps;

    for (let i = steps - 1; i >= 0; i--) {
      player.volume = volumeStep * i;
      await this.delay(stepDuration);
    }
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton export
export const SoundManager = new SoundManagerClass();
