/**
 * bgRemoverCloudService.ts
 *
 * Client for the optional "Cloud (CPU)" Chopper engine: the same
 * `studioludens/birefnet-lite-512` model the browser runs on-device, but
 * executed on a server (see api/bg-remove.js).
 *
 * The on-device engine stays the default; the cloud engine is opt-in and is
 * used for devices that cannot run the 192 MB model locally (or when the
 * visitor prefers it).
 *
 * The cloud engine is a *serverless function*, so whether it exists depends
 * on how the site is served:
 *
 *   - `npm run dev` / `npm run preview:cloud` → the functions are mounted by
 *     a local Node server, so the model runs on *this machine's* CPU, exactly
 *     the same code path as the deployment;
 *   - `npm run dev:site` / `next start` / any plain static host → no /api
 *     routes, the probe answers 404 and the engine is simply not mounted;
 *   - deployed on Vercel → the functions run on Vercel's CPU.
 *
 * In every case the browser only uploads a 512x512 thumbnail and composites
 * the returned mask over the original pixels locally.
 */

import {
  CHOPPER_HEALTH_ENDPOINT,
  compositeChopperMask,
  encodeChopperThumbnail,
  loadImageElement,
  requestChopperMask,
} from '../utils/chopperMask';

export type CloudStage =
  | 'reading-image'
  | 'waiting-for-model'
  | 'running-inference'
  | 'encoding-output';

export type CloudStageSubscriber = (stage: CloudStage, message?: string) => void;

/**
 * Why the cloud engine can or cannot be used right now.
 *
 *  - 'ok'          the function answered (the model may still be loading)
 *  - 'warming-up'  the function is up but the weights are still downloading
 *  - 'not-mounted' this origin serves the site but has no /api functions
 *  - 'error'       the function answered, but the model could not be loaded
 *  - 'unreachable' the request to /api/health itself did not get through
 */
export type CloudEngineReason = 'ok' | 'warming-up' | 'not-mounted' | 'error' | 'unreachable';

export interface CloudEngineStatus {
  /** A function is answering and can serve cutouts (possibly after warming up). */
  reachable: boolean;
  /** The model is loaded, so a request returns a mask right away. */
  ready: boolean;
  reason: CloudEngineReason;
}

export interface CloudRemoveResult {
  blob: Blob;
  elapsedMs: number;
  /**
   * The cloud engine always runs on the server's CPU — the native runtime
   * ships no CUDA payload and the session pins the CPU execution provider
   * (see server/chopperModel.mjs). It is spelled out here so the caller can
   * report the provenance of the output like the on-device path does.
   */
  engine: 'cloud-cpu';
}

const HEALTH_TIMEOUT_MS = 4000;

interface CloudHealth {
  status?: string;
  state?: string;
  ready?: boolean;
}

class BGRemoverCloudService {
  private probed = false;
  private inFlight: Promise<CloudEngineStatus> | null = null;
  private status: CloudEngineStatus = {
    reachable: false,
    ready: false,
    reason: 'unreachable',
  };

  /**
   * Probe the function and classify the answer. The site itself is a static
   * export, so the endpoint may legitimately be missing — the UI uses this
   * to explain that instead of failing mid-job.
   */
  async getStatus(force = false): Promise<CloudEngineStatus> {
    if (this.probed && !force) return this.status;
    if (this.inFlight) return this.inFlight;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    this.inFlight = (async () => {
      try {
        const response = await fetch(CHOPPER_HEALTH_ENDPOINT, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });

        if (response.status === 404 || response.status === 405) {
          // The origin answers, but it does not serve the /api functions:
          // a plain static host, `next dev` or `next start`.
          this.status = { reachable: false, ready: false, reason: 'not-mounted' };
          return this.status;
        }

        let payload: CloudHealth | null = null;
        try {
          payload = (await response.json()) as CloudHealth;
        } catch {
          payload = null;
        }

        if (response.ok) {
          this.status = {
            reachable: true,
            ready: payload?.ready === true,
            reason: 'ok',
          };
        } else if (response.status === 503 && payload?.status === 'warming_up') {
          this.status = { reachable: true, ready: false, reason: 'warming-up' };
        } else {
          this.status = { reachable: false, ready: false, reason: 'error' };
        }
      } catch {
        // Connection refused, DNS failure or timeout: nothing answers here.
        this.status = { reachable: false, ready: false, reason: 'unreachable' };
      } finally {
        clearTimeout(timer);
        this.inFlight = null;
        this.probed = true;
      }
      return this.status;
    })();

    return this.inFlight;
  }

  /** True when a function is answering (it may still be loading the model). */
  async isAvailable(force = false): Promise<boolean> {
    return (await this.getStatus(force)).reachable;
  }

  /** True when the function reports that the model is loaded. */
  isReady(): boolean {
    return this.status.ready;
  }

  /**
   * Remove the background of an image through the cloud engine.
   * Only a 512x512 RGB thumbnail is uploaded; the cutout is composited
   * locally at the original resolution.
   */
  async removeBackground(
    sourceUrl: string,
    onStage?: CloudStageSubscriber
  ): Promise<CloudRemoveResult> {
    const startedAt = Date.now();

    onStage?.('reading-image', 'Reading image data...');
    const image = await loadImageElement(sourceUrl);

    if (!this.isReady()) {
      onStage?.(
        'waiting-for-model',
        'The cloud engine is starting up (the first run downloads the model)...'
      );
    }

    onStage?.('running-inference', 'Cloud engine segmenting subject...');
    const rgb = encodeChopperThumbnail(image);
    const mask = await requestChopperMask(rgb);

    onStage?.('encoding-output', 'Compositing transparent cutout...');
    const blob = await compositeChopperMask(image, mask);

    return { blob, elapsedMs: Date.now() - startedAt, engine: 'cloud-cpu' };
  }
}

export const bgRemoverCloudService = new BGRemoverCloudService();
