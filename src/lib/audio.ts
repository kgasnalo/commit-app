/**
 * SoundManager - Audio orchestration singleton
 * Phase 2.0.3 - Audio Config
 *
 * Handles ambient background sounds and UI feedback sounds
 * for the cinematic onboarding experience.
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
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

class SoundManagerClass {
  private currentAmbient: Audio.Sound | null = null;
  private uiSounds: Map<string, Audio.Sound> = new Map();
  private isInitialized = false;
  private isMuted = false;
  private ambientVolume = 0.3;
  private uiVolume = 0.5;

  /**
   * Initialize audio system and preload sounds
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false, // Respect device mute switch
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
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
          const { sound } = await Audio.Sound.createAsync(source, {
            volume: this.uiVolume,
          });
          this.uiSounds.set(name, sound);
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
        await this.currentAmbient.unloadAsync();
        this.currentAmbient = null;
      }
      return;
    }

    try {
      // Fade out current ambient
      if (this.currentAmbient) {
        await this.fadeOut(this.currentAmbient, duration / 2);
        await this.currentAmbient.unloadAsync();
      }

      // Load and fade in new ambient
      const { sound } = await Audio.Sound.createAsync(trackSource, {
        isLooping: true,
        volume: 0,
      });

      this.currentAmbient = sound;
      await sound.playAsync();
      await this.fadeIn(sound, this.ambientVolume, duration / 2);
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

    const sound = this.uiSounds.get(soundName);
    if (sound) {
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
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
      await this.currentAmbient.stopAsync();
    }
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.currentAmbient) {
      this.currentAmbient.setVolumeAsync(0);
    } else if (!muted && this.currentAmbient) {
      this.currentAmbient.setVolumeAsync(this.ambientVolume);
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
      await this.currentAmbient.unloadAsync();
      this.currentAmbient = null;
    }

    for (const sound of this.uiSounds.values()) {
      await sound.unloadAsync();
    }
    this.uiSounds.clear();

    this.isInitialized = false;
    console.log('[SoundManager] Cleanup complete');
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Fade in a sound over duration
   */
  private async fadeIn(
    sound: Audio.Sound,
    targetVolume: number,
    duration: number
  ): Promise<void> {
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;

    for (let i = 1; i <= steps; i++) {
      await sound.setVolumeAsync(volumeStep * i);
      await this.delay(stepDuration);
    }
  }

  /**
   * Fade out a sound over duration
   */
  private async fadeOut(sound: Audio.Sound, duration: number): Promise<void> {
    const status = (await sound.getStatusAsync()) as AVPlaybackStatus;
    if (!status.isLoaded) return;

    const currentVolume = status.volume ?? this.ambientVolume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = currentVolume / steps;

    for (let i = steps - 1; i >= 0; i--) {
      await sound.setVolumeAsync(volumeStep * i);
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
