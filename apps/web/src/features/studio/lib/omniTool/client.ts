import type { Omni as OmniType } from '@omnimedia/omnitool';
import driverWorkerUrl from '@omnimedia/omnitool/x/driver/driver.worker.bundle.min.js?url';

let omniPromise: Promise<OmniType> | null = null;

/** Lazy Omnitool driver + timeline API (browser WebCodecs pipeline). */
export async function getOmni(): Promise<OmniType> {
  if (!omniPromise) {
    omniPromise = (async () => {
      const { Driver, Omni } = await import('@omnimedia/omnitool');
      const driver = await Driver.setup({ workerUrl: driverWorkerUrl });
      return new Omni(driver);
    })();
  }
  return omniPromise;
}

export async function loadOmniMedia(file: File) {
  const { Datafile } = await import('@omnimedia/omnitool');
  const omni = await getOmni();
  return omni.load({ clip: Datafile.make(file) });
}
