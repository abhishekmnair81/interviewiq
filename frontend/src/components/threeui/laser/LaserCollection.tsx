'use client';

import React from "react";
import { LaserVariants, type LaserVariantsProps, type ThreeUILaserVariant } from "./LaserVariants";
import "./laser.css";

export type LaserVariant = "matrix-field" | ThreeUILaserVariant;

export type LaserCollectionProps = Omit<LaserVariantsProps, "variant"> & {
  variant?: LaserVariant;
};

export function LaserCollection({
  variant = "vanishing-array",
  ...props
}: LaserCollectionProps) {
  // Map "matrix-field" gracefully to "vanishing-array" if invoked in laser context
  const resolvedVariant: ThreeUILaserVariant =
    variant === "matrix-field" ? "vanishing-array" : variant;

  return <LaserVariants variant={resolvedVariant} {...props} />;
}
