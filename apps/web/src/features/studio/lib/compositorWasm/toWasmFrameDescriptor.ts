import type { CompositorFrameDescriptor } from '@/features/studio/lib/compositorFrameDescriptor';
import type { WasmFrameDescriptor, WasmFrameLayerItem } from '@/features/studio/lib/compositorWasm/types';

/** Normalize Vokop frame JSON to the exact OpenCut wasm serde shape. */
export function toWasmFrameDescriptor(frame: CompositorFrameDescriptor): WasmFrameDescriptor {
  return {
    width: frame.width,
    height: frame.height,
    clear: frame.clear,
    items: frame.items.map(toWasmLayerItem),
  };
}

function toWasmLayerItem(item: CompositorFrameDescriptor['items'][number]): WasmFrameLayerItem {
  return {
    type: 'layer',
    textureId: item.textureId,
    transform: item.transform,
    opacity: item.opacity,
    blendMode: item.blendMode,
    effectPassGroups: (item.effectPassGroups as unknown[][]) ?? [],
    mask: (item.mask as WasmFrameLayerItem['mask']) ?? null,
  };
}
