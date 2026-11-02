# LiteRT Super-Resolution Models

## Active Models

### 1. Vitality
- **File**: `Vitality.tflite`
- **Size**: ~1.9 MB
- **Scale**: 4×
- **Architecture**: Compact CNN Super-Resolution
- **Input**: NCHW `[1, 3, H, W]`, float32 [0, 1] normalized RGB (input name: `input`)
- **Output**: NCHW `[1, 3, 4H, 4W]`, float32 RGB (output name: `output`)
- **Acceleration**: LiteRT WebGPU with automatic WASM SIMD fallback
- **Characteristics**: Ultra-fast (~100ms), low memory footprint, crystal-clear edges and de-blurring. Ideal for quick previews, anime, and illustrations.

### 2. Pixel-Dance
- **File**: `Pixel-Dance.tflite`
- **Size**: ~66.9 MB
- **Scale**: 4×
- **Architecture**: Deep Generative Residual Dense Network (ESRGAN / RRDBNet)
- **Input**: NCHW `[1, 3, H, W]`, float32 [0, 1] normalized RGB (input name: `data`)
- **Output**: NCHW `[1, 3, 4H, 4W]`, float32 RGB (output name: `output`)
- **Acceleration**: LiteRT WebGPU with automatic WASM SIMD fallback
- **Characteristics**: High-fidelity micro-texture reconstruction, sharp photographic depth, and 8K clarity.

### 3. Alpha-Satoru
- **File**: `Alpha-Satoru.tflite`
- **Size**: ~67.1 MB
- **Scale**: 4×
- **Architecture**: Real-ESRGAN+ / Alpha-Satoru
- **Input**: NCHW `[1, 3, H, W]`, float32 [0, 1] normalized RGB (input name: `image`)
- **Output**: NCHW `[1, 3, 4H, 4W]`, float32 RGB (output name: `upscaled_image`)
- **Acceleration**: LiteRT WebGPU with automatic WASM SIMD fallback
- **Characteristics**: Studio portrait enhancement, heavy artifact removal, and balanced restoration.