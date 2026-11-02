/** Shared runtime constants used by the background remover. */
export const TRANSFORMERS_VERSION = '4.2.0';
export const TRANSFORMERS_CDN = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/dist/transformers.min.js`;

// Retained in the cache-clear list to remove runtime blobs created by older app versions.
export const RUNTIME_CACHE = 'ort-runtime';
