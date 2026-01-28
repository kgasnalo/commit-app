/**
 * SoundManager - Audio orchestration singleton
 * Phase 2.0.3 - Audio Config
 * Phase 5 - Migrated from expo-av to expo-audio (SDK 54)
 *
 * Handles ambient background sounds and UI feedback sounds
 * for the cinematic onboarding experience.
 */

import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';
import type { OnboardingAct } from '../types/atmosphere.types';

// MonkMode ambient sound keys
export type MonkModeSoundKey = 'none' | 'bonfire' | 'ocean' | 'stream' | 'rain';

/**
 * Resolve a require() asset ID to a local URI string.
 * Workaround for expo-audio iOS bug where numeric asset IDs
 * don't resolve to file paths (GitHub #33665, #33676, #40052).
 */
async function resolveAssetUri(source: number): Promise<string> {
  const [asset] = await Asset.loadAsync(source);
  return asset.localUri || asset.uri;
}

// Audio asset paths
const AMBIENT_TRACKS: Record<OnboardingAct, number> = {
  act1: require('../assets/audio/ambient_calm.mp3'),
  act2: require('../assets/audio/ambient_tension.mp3'),
  act3: require('../assets/audio/ambient_hope.mp3'),
};

const UI_SOUNDS: Record<string, number> = {
  tap: require('../assets/audio/ui_tap.mp3'),
  slide: require('../assets/audio/ui_slide.mp3'),
  success: require('../assets/audio/ui_success.mp3'),
  transition: require('../assets/audio/ui_transition.mp3'),
  toast: require('../assets/audio/ui_toast.mp3'),
};

// Shepard Tone audio files for penalty slider (Phase 2.2.1)
// MonkMode ambient sound assets
const MONK_MODE_SOUNDS: Record<Exclude<MonkModeSoundKey, 'none'>, number> = {
  bonfire: require('../assets/audio/bonfire.mp3'),
  ocean: require('../assets/audio/ocean.mp3'),
  stream: require('../assets/audio/stream.mp3'),
  rain: require('../assets/audio/rain.mp3'),
};

// Shepard Tone audio files for penalty slider (Phase 2.2.1)
const SHEPARD_TONES: Record<string, number> = {
  low: require('../assets/audio/shepard_tone_low.mp3'),
  mid: require('../assets/audio/shepard_tone_mid.mp3'),
  high: require('../assets/audio/shepard_tone_high.mp3'),
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

  // MonkMode ambient sound
  private monkModePlayer: AudioPlayer | null = null;
  private monkModePlayers: Map<string, AudioPlayer> = new Map();
  private monkModeUris: Record<string, string> = {};
  private monkModeVolume = 0.4;

  // Resolved URI caches (workaround for iOS expo-audio numeric asset bug)
  private ambientUris: Partial<Record<OnboardingAct, string>> = {};
  private uiSoundUris: Record<string, string> = {};
  private shepardUris: Record<string, string> = {};

  /**
   * Initialize audio system and preload sounds
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      if (__DEV__) console.log('[SoundManager] Already initialized');
      return;
    }

    try {
      if (__DEV__) console.log('[SoundManager] Initializing audio mode...');
      await setAudioModeAsync({
        playsInSilentMode: true, // Cinematic experience: play audio even in silent mode
        interruptionMode: 'duckOthers',
      });
      if (__DEV__) console.log('[SoundManager] Audio mode set successfully');

      // Resolve all asset URIs (iOS workaround)
      for (const [act, source] of Object.entries(AMBIENT_TRACKS)) {
        this.ambientUris[act as OnboardingAct] = await resolveAssetUri(source);
      }
      for (const [name, source] of Object.entries(UI_SOUNDS)) {
        this.uiSoundUris[name] = await resolveAssetUri(source);
      }
      for (const [name, source] of Object.entries(SHEPARD_TONES)) {
        this.shepardUris[name] = await resolveAssetUri(source);
      }
      for (const [name, source] of Object.entries(MONK_MODE_SOUNDS)) {
        this.monkModeUris[name] = await resolveAssetUri(source);
      }
      if (__DEV__) console.log('[SoundManager] All asset URIs resolved');

      // Preload all sounds
      await this.preloadUISounds();
      await this.preloadShepardTones();
      await this.preloadMonkModeSounds();

      this.isInitialized = true;
      if (__DEV__) console.log('[SoundManager] Initialization complete');
    } catch (error) {
      console.warn('[SoundManager] Initialization failed:', error);
    }
  }

  /**
   * Preload UI sounds for instant playback
   */
  private async preloadUISounds(): Promise<void> {
    for (const [name] of Object.entries(UI_SOUNDS)) {
      try {
        const uri = this.uiSoundUris[name];
        if (!uri) continue;
        const player = createAudioPlayer(uri);
        player.volume = this.uiVolume;
        this.uiSounds.set(name, player);
      } catch (error) {
        console.warn(`[SoundManager] Failed to load UI sound: ${name}`, error);
      }
    }
  }

  /**
   * Crossfade to a new Act's ambient track
   * @param act - Target Act
   * @param duration - Crossfade duration in ms (default: 1000)
   */
  async crossfadeToAct(act: OnboardingAct, duration: number = 1000): Promise<void> {
    if (__DEV__) console.log(`[SoundManager] crossfadeToAct(${act}): initialized=${this.isInitialized}, muted=${this.isMuted}`);
    if (!this.isInitialized || this.isMuted) return;

    const uri = this.ambientUris[act];
    if (!uri) {
      if (__DEV__) console.warn(`[SoundManager] No URI resolved for ${act}`);
      return;
    }

    try {
      // Fade out current ambient
      if (this.currentAmbient) {
        if (__DEV__) console.log('[SoundManager] Fading out current ambient');
        await this.fadeOut(this.currentAmbient, duration / 2);
        this.currentAmbient.remove();
        this.currentAmbient = null;
      }

      // Create and fade in new ambient using resolved URI
      if (__DEV__) console.log(`[SoundManager] Creating player for ${act}, uri: ${uri}`);
      const player = createAudioPlayer(uri);
      if (__DEV__) console.log(`[SoundManager] Player created, isLoaded=${player.isLoaded}`);
      player.loop = true;

      this.currentAmbient = player;

      // Wait for player to be loaded using event listener
      if (!player.isLoaded) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (__DEV__) console.warn('[SoundManager] Load timeout after 5s');
            resolve();
          }, 5000);

          const listener = player.addListener('playbackStatusUpdate', (status) => {
            if (status.isLoaded) {
              clearTimeout(timeout);
              listener.remove();
              resolve();
            }
          });
        });
      }

      player.volume = 0;
      player.play();
      await this.fadeIn(player, this.ambientVolume, duration / 2);
      if (__DEV__) console.log(`[SoundManager] ${act} playing, volume=${player.volume}`);
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
    await this.stopMonkModeSound();
    await this.stopShepardTone();
  }

  // ============================================
  // SHEPARD TONE (Phase 2.2.1)
  // ============================================

  /**
   * Initialize Shepard tone players
   */
  private async preloadShepardTones(): Promise<void> {
    for (const [name] of Object.entries(SHEPARD_TONES)) {
      try {
        const uri = this.shepardUris[name];
        if (!uri) continue;
        const player = createAudioPlayer(uri);
        player.volume = this.shepardVolume;
        player.loop = true;
        this.shepardSounds.set(name, player);
      } catch (error) {
        console.warn(`[SoundManager] Failed to load Shepard tone: ${name}`, error);
      }
    }
  }

  /**
   * Play Shepard tone based on intensity (0-1)
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
    const targetVolume = this.shepardVolume * (0.5 + clampedIntensity * 0.5);

    try {
      for (const player of this.shepardSounds.values()) {
        player.volume = targetVolume;
      }
    } catch (error) {
      console.warn('[SoundManager] Failed to update Shepard intensity:', error);
    }
  }

  // ============================================
  // MONK MODE AMBIENT SOUND
  // ============================================

  /**
   * Preload all MonkMode ambient sound players for instant crossfade
   */
  private async preloadMonkModeSounds(): Promise<void> {
    const loadPromises = Object.entries(MONK_MODE_SOUNDS).map(async ([name]) => {
      try {
        const uri = this.monkModeUris[name];
        if (!uri) return;
        const player = createAudioPlayer(uri);
        player.loop = true;
        player.volume = 0;

        // Wait for player to finish loading before registering
        if (!player.isLoaded) {
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              if (__DEV__) console.warn(`[SoundManager] Monk mode preload timeout: ${name}`);
              resolve();
            }, 5000);
            const listener = player.addListener('playbackStatusUpdate', (status) => {
              if (status.isLoaded) {
                clearTimeout(timeout);
                listener.remove();
                resolve();
              }
            });
          });
        }

        this.monkModePlayers.set(name, player);
        if (__DEV__) console.log(`[SoundManager] Monk mode preloaded: ${name}`);
      } catch (error) {
        console.warn(`[SoundManager] Failed to preload monk mode sound: ${name}`, error);
      }
    });
    await Promise.all(loadPromises);
  }

  /**
   * Play a MonkMode ambient sound in loop with crossfade
   */
  async playMonkModeSound(key: MonkModeSoundKey): Promise<void> {
    if (__DEV__) console.log(`[SoundManager] playMonkModeSound(${key})`);
    if (!this.isInitialized || this.isMuted || key === 'none') return;

    if (this.monkModePlayers.size === 0) {
      await this.preloadMonkModeSounds();
    }

    const newPlayer = this.monkModePlayers.get(key);
    if (!newPlayer) {
      if (__DEV__) console.warn(`[SoundManager] No preloaded player for: ${key}`);
      return;
    }

    try {
      const oldPlayer = this.monkModePlayer;
      const crossfadeDuration = 800;

      this.monkModePlayer = newPlayer;
      newPlayer.seekTo(0);
      newPlayer.volume = 0;
      newPlayer.play();

      // Crossfade: fade out old + fade in new simultaneously
      const fadeInPromise = this.fadeIn(newPlayer, this.monkModeVolume, crossfadeDuration);
      const fadeOutPromise = oldPlayer && oldPlayer !== newPlayer
        ? this.fadeOut(oldPlayer, crossfadeDuration).then(() => {
            oldPlayer.pause();
          })
        : Promise.resolve();

      await Promise.all([fadeInPromise, fadeOutPromise]);
      if (__DEV__) console.log(`[SoundManager] MonkMode sound ${key} playing`);
    } catch (error) {
      console.warn(`[SoundManager] Failed to play monk mode sound: ${key}`, error);
    }
  }

  /**
   * Stop MonkMode ambient sound with fade out
   */
  async stopMonkModeSound(): Promise<void> {
    if (this.monkModePlayer) {
      try {
        await this.fadeOut(this.monkModePlayer, 400);
        this.monkModePlayer.pause();
      } catch (error) {
        console.warn('[SoundManager] Failed to stop monk mode sound:', error);
      }
      this.monkModePlayer = null;
    }
  }

  /**
   * Play a short preview of a MonkMode sound (2 seconds)
   */
  async previewMonkModeSound(key: MonkModeSoundKey): Promise<void> {
    if (!this.isInitialized || key === 'none') return;

    if (this.monkModePlayers.size === 0) {
      await this.preloadMonkModeSounds();
    }

    const newPlayer = this.monkModePlayers.get(key);
    if (!newPlayer) return;

    try {
      const oldPlayer = this.monkModePlayer;
      const crossfadeDuration = 500;

      this.monkModePlayer = newPlayer;
      newPlayer.seekTo(0);
      newPlayer.volume = 0;
      newPlayer.play();

      const fadeInPromise = this.fadeIn(newPlayer, this.monkModeVolume, crossfadeDuration);
      const fadeOutPromise = oldPlayer && oldPlayer !== newPlayer
        ? this.fadeOut(oldPlayer, crossfadeDuration).then(() => {
            oldPlayer.pause();
          })
        : Promise.resolve();

      await Promise.all([fadeInPromise, fadeOutPromise]);

      // Stop after 2 seconds
      setTimeout(async () => {
        if (this.monkModePlayer === newPlayer) {
          await this.stopMonkModeSound();
        }
      }, 2000);
    } catch (error) {
      console.warn('[SoundManager] Failed to preview monk mode sound:', error);
    }
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      if (this.currentAmbient) this.currentAmbient.volume = 0;
      if (this.monkModePlayer) this.monkModePlayer.volume = 0;
    } else {
      if (this.currentAmbient) this.currentAmbient.volume = this.ambientVolume;
      if (this.monkModePlayer) this.monkModePlayer.volume = this.monkModeVolume;
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
      this.currentAmbient.remove();
      this.currentAmbient = null;
    }

    this.monkModePlayer = null;
    for (const player of this.monkModePlayers.values()) {
      player.remove();
    }
    this.monkModePlayers.clear();

    for (const player of this.uiSounds.values()) {
      player.remove();
    }
    this.uiSounds.clear();

    for (const player of this.shepardSounds.values()) {
      player.remove();
    }
    this.shepardSounds.clear();

    this.isInitialized = false;
    this.isMuted = false;
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
