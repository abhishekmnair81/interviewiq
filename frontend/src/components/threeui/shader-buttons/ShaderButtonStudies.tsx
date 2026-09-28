import { type NeuformIsolatedEffectProps } from "../neuform-isolated/NeuformIsolatedEffects";

export type ShaderButtonStudyVariant = "liquid-glass" | "intelligence" | "holo-foil" | "particles" | "voice-orb" | "water" | "dither-hold" | "lava-lamp" | "gold" | "ink";

export function ShaderButtonStudy({ variant, ...props }: NeuformIsolatedEffectProps & { variant: ShaderButtonStudyVariant }) {
  return <div {...props}>ShaderButtonStudy Stub: {variant}</div>;
}
