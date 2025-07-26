/// <reference path="../.astro/types.d.ts" />

interface Window {
  projectDataReady?: boolean;
  THREE?: typeof import("three");
  CustomEase?: any;
  SplitText?: any;
  ScrollTrigger?: any;
  startGallery?: () => void;
}