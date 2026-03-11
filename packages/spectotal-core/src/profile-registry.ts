import type { SpectotalProfile } from './types.js';

export class SpectotalProfileRegistry {
  private readonly profiles = new Map<string, SpectotalProfile>();

  register(profile: SpectotalProfile): this {
    if (this.profiles.has(profile.id)) {
      throw new Error(`Profile "${profile.id}" is already registered.`);
    }

    this.profiles.set(profile.id, profile);
    return this;
  }

  get(profileId: string): SpectotalProfile | undefined {
    return this.profiles.get(profileId);
  }

  require(profileId: string): SpectotalProfile {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Unknown profile "${profileId}".`);
    }
    return profile;
  }

  list(): SpectotalProfile[] {
    return Array.from(this.profiles.values());
  }
}

export function createProfileRegistry(profiles: SpectotalProfile[] = []): SpectotalProfileRegistry {
  const registry = new SpectotalProfileRegistry();
  for (const profile of profiles) {
    registry.register(profile);
  }
  return registry;
}
