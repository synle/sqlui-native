/** Allows PNG image files to be imported as a URL string. */
declare module "*.png" {
  const src: string;
  export default src;
}

/** Allows JPG image files to be imported as a URL string. */
declare module "*.jpg" {
  const src: string;
  export default src;
}

/** Allows JPEG image files to be imported as a URL string. */
declare module "*.jpeg" {
  const src: string;
  export default src;
}

/** Allows GIF image files to be imported as a URL string. */
declare module "*.gif" {
  const src: string;
  export default src;
}

/** Allows SVG image files to be imported as a URL string. */
declare module "*.svg" {
  const src: string;
  export default src;
}

/** Allows ICO image files to be imported as a URL string. */
declare module "*.ico" {
  const src: string;
  export default src;
}

/** Allows WebP image files to be imported as a URL string. */
declare module "*.webp" {
  const src: string;
  export default src;
}

/** Allows BMP image files to be imported as a URL string. */
declare module "*.bmp" {
  const src: string;
  export default src;
}

/** Allows Mustache template files to be imported as raw strings via Vite's ?raw suffix. */
declare module "*.mustache?raw" {
  const content: string;
  export default content;
}
