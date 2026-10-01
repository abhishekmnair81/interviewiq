import { TextAnimationCollection } from '@/shaders/neuform-isolated/NeuformIsolatedEffects';
import '@/shaders/threeui.css';

export default function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-[9999] bg-surface-0 flex items-center justify-center pointer-events-none">
      <div className="shader-frame w-full h-full absolute inset-0">
        <TextAnimationCollection variant="particle-wordmark" mode="dark" hue={0} saturation={1.00} brightness={1.00} />
      </div>
    </div>
  );
}
