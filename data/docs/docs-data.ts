export type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; id: string; text: string }
  | { type: "callout"; tone: "info" | "tip" | "warning"; title: string; text: string }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "bullets"; items: string[] }
  | { type: "code"; language: string; title: string; code: string }
  | { type: "video"; title: string; description: string; duration: string; videoUrl?: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export type Article = {
  slug: string;
  title: string;
  description: string;
  category: string;
  updated: string;
  icon: string;
  featured?: boolean;
  blocks: DocBlock[];
};

export type NavItem = {
  slug: string;
  label: string;
  href?: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { slug: "overview", label: "Overview", href: "/docs/" },
    ],
  },
  {
    title: "GETTING STARTED",
    items: [
      { slug: "getting-started", label: "Welcome to Pixelify" },
    ],
  },
  {
    title: "AI TOOLS",
    items: [
      { slug: "background-remover", label: "Background Remover" },
      { slug: "ai-upscaler", label: "AI Upscaler" },
    ],
  },
  {
    title: "UNDER THE HOOD",
    items: [
      { slug: "models-and-performance", label: "Models & performance" },
      { slug: "privacy-and-security", label: "Privacy & security" },
    ],
  },
  {
    title: "HELP & SUPPORT",
    items: [
      { slug: "troubleshooting", label: "Troubleshooting" },
    ],
  },
];

export const articles: Record<string, Article> = {
  "getting-started": {
    slug: "getting-started",
    title: "Welcome to Pixelify",
    description: "Your comprehensive guide to on-device AI photo editing: 8× super-resolution upscaling, neural background removal, and creative enhancements.",
    category: "Getting started",
    updated: "Updated",
    icon: "sparkles",
    featured: true,
    blocks: [
      { type: "paragraph", text: "Pixelify is a modern, private on-device AI photo editor running 100% in your browser. Powered by client-side WebGPU and multi-threaded LiteRT/WebAssembly, it performs heavy super-resolution and neural segmentation right inside your device's memory without sending your images to remote servers." },
      { type: "callout", tone: "info", title: "100% Private & Free", text: "Your source photos never leave your device. Model weights are downloaded once into your browser cache, allowing you to edit images with zero cloud latency and total privacy." },
      { type: "heading", id: "core-capabilities", text: "Core AI capabilities" },
      { type: "bullets", items: [
        "AI Super Enlargement: Upscale photos 2×, 4×, and up to 8× with dimensions reaching up to 16,384 × 16,384 (16K ultra HD) using tiled inference.",
        "Three Specialized Upscaler Models: Choose between Vitality (ultra-fast, 1.9MB), Pixel-Dance (8K ultra precision, 67MB), and Alpha-Satoru (studio portrait restoration, 65MB).",
        "Dual Background Remover: Instant neural segmentation with Chopper AI for quick cutouts and Diablo (Studio 1024 Matting) for fine hair, animal fur, and transparent glass.",
        "Creative Enhancement Suite: Fine-tune Face Restoration, AI Sharpening, Image Denoising, Color Correction, and HDR Boost.",
        "Truck Background & 3D Studio: Place your cutout subjects into custom 3D vehicle scenes or studio backdrops.",
        "Side-by-Side Comparison: Real-time split before/after comparator slider to inspect full-resolution micro-details.",
      ]},
      { type: "heading", id: "your-first-edit", text: "Make your first edit" },
      { type: "steps", items: [
        { title: "Select a tool", text: "Navigate to AI Upscaler to enhance resolution and detail, or Background Remover to isolate subjects." },
        { title: "Drop your image", text: "Drag and drop any PNG, JPG, or WEBP file. Pixelify supports high-resolution inputs with automatic memory safety." },
        { title: "Choose a model & preset", text: "Select your preferred neural model and tuning preset (e.g., Portrait, Crisp, Landscape, or Balanced)." },
        { title: "Adjust enhancements", text: "Optionally adjust sharpness, denoise level, face restoration, or HDR boost sliders in the workspace." },
        { title: "Inspect and export", text: "Slide the before/after comparator to verify fidelity, then download the full-resolution PNG to your device." },
      ]},
      { type: "heading", id: "system-requirements", text: "Recommended setup" },
      { type: "paragraph", text: "For the fastest performance, use a Chromium-based browser (Google Chrome or Microsoft Edge) on a device with a dedicated or integrated GPU supporting WebGPU. WebAssembly SIMD fallback is automatically engaged on Firefox, Safari, or older hardware." },
      { type: "heading", id: "watch-and-learn", text: "Watch and learn" },
      { type: "video", title: "Pixelify Quick Tour", description: "Learn how to use Pixelify's on-device AI tools in under 60 seconds.", duration: "01:00", videoUrl: "" },
    ],
  },
  "background-remover": {
    slug: "background-remover",
    title: "Background Remover",
    description: "Instant neural subject segmentation with Chopper and Diablo models, transparent PNG export, and custom studio backgrounds.",
    category: "AI tools",
    updated: "Updated",
    icon: "scan",
    featured: true,
    blocks: [
      { type: "paragraph", text: "Pixelify Background Remover separates subjects from complex environments in real time. Running directly on your device via Web Workers, it delivers studio-quality cutouts for e-commerce, portraits, product graphics, and creative marketing." },
      { type: "callout", tone: "tip", title: "Zero cloud upload", text: "Unlike traditional online background removers that transmit your private images to cloud APIs, Pixelify executes segmentation locally in your browser." },
      { type: "heading", id: "two-neural-models", text: "Dual AI matting models" },
      { type: "table", headers: ["Model", "Architecture", "Download Size", "Best For"], rows: [
        ["Chopper (Fast / Clean)", "High-Speed 512 Matting", "~190MB", "Instant cutouts, e-commerce products, clear subjects, and fast batching (~1-2s)."],
        ["Diablo (Ultra Precision)", "Studio 1024 Matting", "~200MB", "High-frequency edge matting, fine hair strands, animal fur, translucent glass, and jewelry."],
      ]},
      { type: "heading", id: "workflow-steps", text: "How to remove a background" },
      { type: "steps", items: [
        { title: "Upload your photo", text: "Drop your image into the workspace (up to 20MB supported)." },
        { title: "Choose Chopper or Diablo", text: "Use Chopper for speed or Diablo when you need maximum edge definition on hair and complex silhouettes." },
        { title: "Preview the mask", text: "Inspect fine edge boundaries using the interactive before/after split slider." },
        { title: "Select a background mode", text: "Keep transparent alpha, choose a solid studio color, apply a radiant gradient, or upload a custom backdrop." },
        { title: "Try Truck Background", text: "Switch to the Truck 3D environment to preview product cutouts inside a high-end studio display." },
        { title: "Download", text: "Save the processed image as a high-resolution PNG with preserved transparency." },
      ]},
      { type: "heading", id: "edge-refinement-tips", text: "Pro tips for edge fidelity" },
      { type: "bullets", items: [
        "Contrast helps: High contrast between subject and background yields pixel-perfect boundary detection.",
        "Diablo for wispy hair: When cutting out flyaway hair or pet fur, switch to Diablo (Ultra Precision) for strand-level preservation.",
        "Preserve original dimensions: The output maintains your original canvas aspect ratio and resolution.",
      ]},
    ],
  },
  "ai-upscaler": {
    slug: "ai-upscaler",
    title: "AI Upscaler",
    description: "Super-resolution upscaling up to 8× and 16K with Vitality, Pixel-Dance, and Alpha-Satoru models, tiled inference, and creative restoration.",
    category: "AI tools",
    updated: "Updated",
    icon: "maximize",
    featured: true,
    blocks: [
      { type: "paragraph", text: "Pixelify AI Upscaler uses deep neural networks to reconstruct missing high-frequency details, eliminate compression noise, restore facial contours, and scale images up to 8× resolution - entirely within your browser." },
      { type: "callout", tone: "info", title: "16K Resolution with Tiled Processing", text: "Pixelify supports exports up to 16,384 × 16,384 pixels. Our smart tiling engine divides large images into 128×128 tiles to prevent GPU memory exhaustion, enabling massive upscales even on standard laptops." },
      { type: "heading", id: "three-models", text: "Three specialized upscaler models" },
      { type: "table", headers: ["Model", "Scale", "Size", "Inference Speed", "Ideal Use Case"], rows: [
        ["Vitality", "4× (up to 8×)", "1.9MB", "~120ms (Ultra Fast)", "Anime, illustrations, digital logos, de-blurring, and low-spec hardware."],
        ["Pixel-Dance", "4× (up to 8×)", "67MB", "~650ms (Precision)", "Complex textures, landscapes, architectural photography, and 8K fine-art prints."],
        ["Alpha-Satoru", "4× (up to 8×)", "65MB", "~450ms (Studio Quality)", "Portraits, people, old photo restoration, compression artifact cleanup, and high-DPI displays."],
      ]},
      { type: "heading", id: "enhancement-controls", text: "Creative enhancement suite" },
      { type: "bullets", items: [
        "Face Restoration & Enhancement: Automatically sharpens eyes, lips, and facial hair without uncanny distortion.",
        "AI Image Sharpener: Reconstructs micro-edges and counters camera motion or lens softness.",
        "Image Denoiser: Filters out ISO sensor noise, grain, and JPEG block artifacts while preserving organic textures.",
        "Color Correction: Adjusts color depth and vibrancy to bring washed-out photos back to life.",
        "HDR Boost: Expands dynamic range, lifting dark shadows while retaining bright highlight details.",
        "Brightness & Contrast: Fine-tune exposure balance with responsive real-time canvas preview.",
      ]},
      { type: "heading", id: "upscaling-guide", text: "Step-by-step upscaling" },
      { type: "steps", items: [
        { title: "Import image", text: "Select any PNG, JPG, or WEBP photo up to 15MB." },
        { title: "Select model & preset", text: "Pick Vitality, Pixel-Dance, or Alpha-Satoru, and choose an optimized preset (e.g. Portrait, Photography, Crisp)." },
        { title: "Set scale factor", text: "Select 2×, 4×, or maximum 8× upscaling based on your target resolution." },
        { title: "Tweak sliders", text: "Adjust sharpness, denoise, face restoration, or HDR boost if desired." },
        { title: "Inspect with comparator", text: "Drag the before/after slider across the canvas to verify edge fidelity at 100% zoom." },
        { title: "Export PNG", text: "Click Export to save your uncompressed high-resolution image." },
      ]},
    ],
  },
  "models-and-performance": {
    slug: "models-and-performance",
    title: "Models & performance",
    description: "Deep dive into model architectures, WebGPU vs. WebAssembly execution, tiling mechanics, and browser performance optimization.",
    category: "Under the hood",
    updated: "Updated",
    icon: "cpu",
    blocks: [
      { type: "paragraph", text: "Pixelify delivers production-grade neural networks to client browsers by pairing hardware-accelerated WebGPU compute shaders with optimized WebAssembly (WASM SIMD and multi-threading) runtimes." },
      { type: "heading", id: "model-catalog", text: "Comprehensive model registry" },
      { type: "table", headers: ["Model", "Category", "Size", "Engine", "Key Characteristics"], rows: [
        ["Vitality", "Super-Resolution", "1.9MB", "LiteRT WASM", "Extremely lightweight, ~120ms execution, perfect for anime & sharp edges."],
        ["Pixel-Dance", "Super-Resolution", "67MB", "WebGPU / LiteRT", "Deep generative super-resolution for photographic micro-detail."],
        ["Alpha-Satoru", "Super-Resolution", "65MB", "WebGPU / LiteRT", "Studio portrait model with artifact suppression and facial geometry restoration."],
        ["Chopper", "Neural Matting", "~190MB", "Transformers.js / WebGPU", "High-speed 512 matting network for instant e-commerce and portrait subject separation."],
        ["Diablo", "High-Precision Matting", "~200MB", "ONNX Runtime / WebGPU", "Studio 1024 matting network for complex fur, hair strands, and semi-transparent glass."],
      ]},
      { type: "heading", id: "execution-engines", text: "Execution engines" },
      { type: "paragraph", text: "Pixelify automatically benchmarks your browser upon load to choose the optimal execution provider:" },
      { type: "bullets", items: [
        "WebGPU: Direct GPU compute shaders for parallel neural tensor operations, enabling sub-second inferences.",
        "LiteRT WASM with SIMD: WebAssembly runtime using Single Instruction Multiple Data vectorization for fast CPU inference.",
        "Multi-threaded Web Workers: Keeps image decoding, canvas manipulation, and neural inference off the main browser UI thread to guarantee 60 FPS responsiveness.",
      ]},
      { type: "heading", id: "tiled-inference", text: "Tiled inference architecture" },
      { type: "paragraph", text: "To overcome browser GPU memory (VRAM) ceilings, Pixelify slices large input images into overlapping 128×128 tiles, feeds them through the neural network, and stitches them back seamlessly with blending algorithms to eliminate tile seam artifacts." },
      { type: "heading", id: "optimizing-speed", text: "How to maximize performance" },
      { type: "bullets", items: [
        "Enable WebGPU: Use Google Chrome or Microsoft Edge with hardware acceleration enabled.",
        "Keep Tab Active: Browsers throttle background tabs; keeping the Pixelify tab in focus accelerates inference.",
        "Manage Browser Cache: Model weights are stored in Cache Storage / IndexedDB so subsequent visits run instantly offline.",
      ]},
    ],
  },
  "privacy-and-security": {
    slug: "privacy-and-security",
    title: "Privacy & security",
    description: "Learn how Pixelify's zero-upload, on-device architecture guarantees total confidentiality for your photos.",
    category: "Under the hood",
    updated: "Updated",
    icon: "shield-check",
    blocks: [
      { type: "paragraph", text: "In an era of aggressive cloud data collection, Pixelify is engineered with privacy as a mathematical guarantee: your source images and edited results never leave your browser." },
      { type: "callout", tone: "info", title: "Zero Server Uploads", text: "No cloud inference endpoints, no remote storage buckets, no AI training on your personal photos. All calculations occur inside your device's RAM and GPU." },
      { type: "heading", id: "local-first-guarantee", text: "What happens to your files?" },
      { type: "bullets", items: [
        "Input Images: Read directly into browser memory (ArrayBuffer/Canvas) via standard HTML5 File APIs.",
        "Inference: Executed locally via WebGPU shaders or LiteRT WebAssembly in sandboxed Web Workers.",
        "Output Images: Generated directly on HTML5 Canvas and saved via browser client download links.",
        "Zero Telemetry on Images: We never log image metadata, coordinates, or pixel data.",
      ]},
      { type: "heading", id: "network-requests", text: "Why does Pixelify make network calls?" },
      { type: "paragraph", text: "The only network requests made by Pixelify are for fetching the static application bundle, Google Fonts, and the static neural model weights (.onnx / .tflite files) on first run. Once downloaded, these assets are cached locally for offline editing." },
    ],
  },
  "troubleshooting": {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Step-by-step solutions for WebGPU detection, model caching, browser memory limits, and export issues.",
    category: "Help & support",
    updated: "Updated",
    icon: "life-buoy",
    blocks: [
      { type: "heading", id: "webgpu-issues", text: "WebGPU is showing as unavailable" },
      { type: "bullets", items: [
        "Verify browser compatibility: Google Chrome 113+ and Microsoft Edge 113+ natively support WebGPU.",
        "Enable Hardware Acceleration: Go to Settings > System in Chrome/Edge and ensure 'Use graphics acceleration when available' is enabled.",
        "Check WebGPU flag: Navigate to chrome://flags/#enable-unsafe-webgpu if using Linux or unsupported graphics drivers.",
        "Fallback engine: Pixelify will automatically switch to LiteRT WASM if WebGPU is absent.",
      ]},
      { type: "heading", id: "model-loading-hang", text: "Model download gets stuck or takes too long" },
      { type: "bullets", items: [
        "Check your internet connection: Initial model weights range from 1.9MB (Vitality) to ~200MB (Diablo / Chopper).",
        "Clear Model Cache: Click the settings gear in the top bar and select 'Clear Model Cache' to purge incomplete downloads, then refresh.",
        "Disable aggressive ad blockers: Ensure ad blockers or privacy extensions are not blocking binary CDN requests.",
      ]},
      { type: "heading", id: "browser-out-of-memory", text: "Browser crashes or runs out of memory" },
      { type: "callout", tone: "warning", title: "Scale and Image Dimensions", text: "Upscaling an 8K image to 8× produces a 64K canvas requiring gigabytes of RAM. If a tab crashes, reduce the scale factor to 2× or 4×, or use a smaller input photo." },
      { type: "heading", id: "export-trouble", text: "Export button does not trigger download" },
      { type: "bullets", items: [
        "Confirm processing has completed: Ensure the progress ring reaches 100% and the comparator slider is visible.",
        "Allow automatic downloads: Check if your browser displays a 'Download blocked' icon in the address bar.",
        "Check storage space: Ensure your device has sufficient free disk space to store uncompressed PNG files.",
      ]},
    ],
  },
};
