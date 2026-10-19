import React, { useEffect, useRef, useState, type DragEvent } from "react";

interface UploadAreaProps {
  onFile: (file: File) => void;
  isLoading: boolean;
  fileName?: string;
  fileSize?: number;
  onClear: () => void;
  title?: string;
  description?: string;
  beforeImage?: string;
  afterImage?: string;

  // Image used for the visual demo shown before upload.
  // Example: "/images/upscale-demo.jpg"
  previewImage?: string;
  maxSizeMB?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadArea({
  onFile,
  isLoading,
  fileName,
  fileSize,
  onClear,
  title = "Upscale",
  description = "Upload your images to\n enhance their resolution and quality.",
  beforeImage,
  afterImage,
  previewImage = "/spiderman3.jpeg",
  maxSizeMB = 15,
}: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [slider, setSlider] = useState(50);

  // --------------------------------------------------
  // Clipboard paste
  // --------------------------------------------------
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;

      if (!files || files.length === 0) return;

      const file = files[0];

      if (file.type.startsWith("image/")) {
        onFile(file);
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [onFile]);

  // --------------------------------------------------
  // File selection
  // --------------------------------------------------
  const handleClick = () => {
    if (!isLoading) {
      inputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      onFile(file);
    }

    // Allows selecting the same file again.
    e.target.value = "";
  };

  // --------------------------------------------------
  // Drag & drop
  // --------------------------------------------------
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoading) {
      setDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setDragging(false);

    if (isLoading) return;

    const file = e.dataTransfer.files?.[0];

    if (file && file.type.startsWith("image/")) {
      onFile(file);
    }
  };

  // --------------------------------------------------
  // Keyboard
  // --------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  // --------------------------------------------------
  // Slider
  // --------------------------------------------------
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlider(Number(e.target.value));
  };

  const leftImage = beforeImage || previewImage;
  const rightImage = afterImage || previewImage;

  return (
    <section className="w-full px-1">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative
          min-h-[680px]
          w-full
          overflow-hidden
          rounded-[16px]
          border
          border-dashed
          bg-black
          transition-all
          duration-300
          outline-none

          ${dragging
            ? "border-white/60 bg-white/[0.025]"
            : "border-white/[0.22] hover:border-white/[0.32]"
          }

          ${isLoading ? "cursor-wait" : "cursor-pointer"}

          focus-visible:border-white/50
          focus-visible:ring-1
          focus-visible:ring-white/20
        `}
      >
        {/* ------------------------------------------------
            Hidden file input
        ------------------------------------------------ */}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* ------------------------------------------------
            Very subtle ambient lighting
        ------------------------------------------------ */}
        <div
          className="
            pointer-events-none
            absolute
            left-1/2
            top-16
            h-[520px]
            w- full
            -translate-x-1/2
            rounded-full
            bg-white/[0.015]
            blur-[100px]
          "
        />

        {/* ------------------------------------------------
            Content
        ------------------------------------------------ */}
        <div
          className="
            relative
            z-10
            flex
            min-h-[520px]
            flex-col
            items-center
            justify-start
            px-6
            pt-[55px]
            text-center
          "
        >
          {/* =================================================
              BEFORE / AFTER PREVIEW
             ================================================= */}
          <div
            className="
              group
              relative
              h-[278px]
              w-[372px]
              max-w-full
              overflow-hidden
              rounded-[17px]
              bg-[#111]
              shadow-[0_25px_80px_rgba(0,0,0,0.55)]
              select-none
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full enhanced image */}
            <img
              src={rightImage}
              alt=""
              draggable={false}
              className="
                absolute
                inset-0
                h-full
                w-full
                object-cover
              "
            />

            {/* BEFORE side: show the original image only over the left portion of the frame */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                clipPath: `inset(0 ${100 - slider}% 0 0)`,
              }}
            >
              <img
                src={leftImage}
                alt=""
                draggable={false}
                className="
                  absolute
                  inset-0
                  h-full
                  w-full
                  object-cover
                "
              />
            </div>

            {/* Divider */}
            <div
              className="
                pointer-events-none
                absolute
                inset-y-0
                z-20
                w-[2px]
                -translate-x-1/2
                bg-white
                shadow-[0_0_10px_rgba(255,255,255,0.25)]
              "
              style={{
                left: `${slider}%`,
              }}
            />

            {/* Slider handle */}
            <div
              className="
                pointer-events-none
                absolute
                top-1/2
                z-30
                flex
                h-[30px]
                w-[30px]
                -translate-x-1/2
                -translate-y-1/2
                items-center
                justify-center
                rounded-[15px]
                bg-white
                text-black
                shadow-[0_8px_30px_rgba(0,0,0,0.3)]
              "
              style={{
                left: `${slider}%`,
              }}
            >
              <div className="flex items-center gap-[5px]">
                <svg
                  width="7"
                  height="11"
                  viewBox="0 0 7 11"
                  fill="none"
                >
                  <path
                    d="M6 1L1 5.5L6 10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <svg
                  width="7"
                  height="11"
                  viewBox="0 0 7 11"
                  fill="none"
                >
                  <path
                    d="M1 1L6 5.5L1 10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Actual invisible slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={slider}
              onChange={handleSliderChange}
              onClick={(e) => e.stopPropagation()}
              aria-label="Compare original and enhanced image"
              className="
                absolute
                inset-0
                z-40
                h-full
                w-full
                cursor-ew-resize
                opacity-0
              "
            />
          </div>

          {/* =================================================
              TITLE
             ================================================= */}
          <h1
            className="
              mt-[39px]
              text-[38px]
              font-[800]
              uppercase
              leading-none
              tracking-[-1.5px]
              text-white

              sm:text-[40px]
            "
          >
            {title}
          </h1>

          {/* =================================================
              DESCRIPTION
             ================================================= */}
          <p
            className="
              mt-[27px]
              max-w-[390px]
              text-[18px]
              font-[400]
              leading-[1.45]
              tracking-[-0.25px]
              text-white/40
            "
          >
            {description.split('\n').map((line, index) => (
              <React.Fragment key={line + index}>
                {index > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </p>

          {/* =================================================
              UPLOAD BUTTON / SELECTED FILE
             ================================================= */}
          {fileName ? (
            <div
              className="
                mt-[24px]
                flex
                flex-col
                items-center
              "
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="
                  flex
                  max-w-[340px]
                  items-center
                  gap-3
                  rounded-[13px]
                  border
                  border-white/10
                  bg-white/[0.06]
                  px-4
                  py-3
                "
              >
                {/* Check */}
                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-white
                    text-black
                  "
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 12.5L9.5 17L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-white">
                    {fileName}
                  </p>

                  <p className="mt-0.5 text-xs text-white/35">
                    {fileSize ? formatSize(fileSize) : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClear}
                  className="
                    ml-2
                    shrink-0
                    rounded-lg
                    px-2
                    py-1
                    text-xs
                    text-white/40
                    transition-colors
                    hover:bg-white/10
                    hover:text-white
                  "
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              className="
                group
                mt-[22px]
                flex
                h-[58px]
                items-center
                gap-3
                rounded-[15px]
                bg-white
                px-[25px]
                text-[18px]
                font-[700]
                tracking-[-0.3px]
                text-black
                shadow-[0_12px_40px_rgba(255,255,255,0.08)]
                transition-all
                duration-200

                hover:scale-[1.025]
                hover:bg-white/90
                hover:shadow-[0_15px_50px_rgba(255,255,255,0.12)]

                active:scale-[0.98]

                disabled:cursor-wait
                disabled:opacity-60
              "
            >
              {/* Upload icon */}
              <svg
                className="h-[21px] w-[21px] transition-transform duration-200 group-hover:-translate-y-0.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 16V4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <path
                  d="M7 9L12 4L17 9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M4 16V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>

              {isLoading ? "Processing..." : "Upload Media"}
            </button>
          )}

          {/* =================================================
              SUBTLE HELP TEXT
             ================================================= */}
          {!fileName && (
            <p
              className="
                mt-4
                text-[11px]
                tracking-[0.1px]
                text-white/20
              "
            >
              PNG, JPEG, WEBP · up to {maxSizeMB}MB · Ctrl + V to paste
            </p>
          )}
        </div>

        {/* =================================================
            DRAGGING OVERLAY
           ================================================= */}
        <div
          className={`
            pointer-events-none
            absolute
            inset-0
            z-50
            flex
            items-center
            justify-center
            rounded-[16px]
            bg-white/[0.035]
            backdrop-blur-[2px]
            transition-all
            duration-200

            ${dragging
              ? "visible opacity-100"
              : "invisible opacity-0"
            }
          `}
        >
          <div
            className="
              rounded-[18px]
              border
              border-white/20
              bg-black/70
              px-8
              py-5
              shadow-2xl
              backdrop-blur-xl
            "
          >
            <p className="text-lg font-bold text-white">
              Drop image here
            </p>

            <p className="mt-1 text-xs text-white/40">
              Release to start enhancing
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}