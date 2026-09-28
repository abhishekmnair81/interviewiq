'use client';

import React from "react";
import { LaserCollection } from "./LaserCollection";

export function Scene() {
  return (
    <div className="shader-frame relative w-full h-full min-h-[300px]">
      <LaserCollection
        variant="vanishing-array"
        speed={1.00}
        size={1.00}
        length={1.00}
        density={1.00}
        opacity={1.00}
        hue={0}
        saturation={1.00}
        brightness={1.00}
      />
    </div>
  );
}
