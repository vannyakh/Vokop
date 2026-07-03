import { Driver, Omni, Datafile } from '@omnimedia/omnitool';
import driverWorkerUrl from '@omnimedia/omnitool/x/driver/driver.worker.bundle.min.js?url';

let omniPromise: Promise<Omni> | null = null;

/** Lazy Omnitool driver + timeline API (browser WebCodecs pipeline). */
export function getOmni(): Promise<Omni> {
  if (!omniPromise) {
    omniPromise = Driver.setup({ workerUrl: driverWorkerUrl }).then((driver) => new Omni(driver));
  }
  return omniPromise;
}

export async function loadOmniMedia(file: File) {
  const omni = await getOmni();
  return omni.load({ clip: Datafile.make(file) });
}

export { Driver, Omni, Datafile };
