import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Canvas as FabricCanvas, FabricImage, Line, Rect, controlsUtils } from 'fabric';

export type FabricEditMode = 'transform' | 'crop';
export type FabricCropRatio = 'free' | '1:1' | '4:5' | '16:9' | '9:16';

export interface SubjectTransform {
  relX: number; // Normalized offset from artboard center (-0.5 to 0.5)
  relY: number; // Normalized offset from artboard center (-0.5 to 0.5)
  scale: number; // Scale multiplier (1 = default fit size)
  rotation: number; // Angle in degrees (-180 to 180)
  flipX: boolean;
  flipY: boolean;
}

export const DEFAULT_SUBJECT_TRANSFORM: SubjectTransform = {
  relX: 0,
  relY: 0,
  scale: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
};

export interface FabricImageEditorHandle {
  flipX: () => void;
  flipY: () => void;
  resetTransform: () => void;
  apply: () => Promise<void> | void;
  cancel: () => void;
  selectCropFrame: () => void;
  selectCropImage: () => void;
  setCropZoom: (zoom: number) => void;
  setRotation: (angle: number) => void;
  getCurrentTransform?: () => SubjectTransform | null;
}

export interface FabricImageEditorProps {
  imageUrl: string;
  artboardWidth?: number;
  artboardHeight?: number;
  naturalArtboardWidth?: number;
  naturalArtboardHeight?: number;
  mode: FabricEditMode;
  cropRatio: FabricCropRatio;
  backgroundStyle?: string;
  customBgColor?: string;
  rotation?: number;
  initialScale?: number;
  initialRotation?: number;
  initialPosition?: { x: number; y: number };
  subjectTransform?: SubjectTransform;
  hasCustomBg?: boolean;
  cropTarget?: 'frame' | 'image';
  cropZoom?: number;
  onCropTargetChange?: (target: 'frame' | 'image') => void;
  onCropZoomChange?: (zoom: number) => void;
  onCropRatioChange?: (ratio: FabricCropRatio) => void;
  onRotationChange?: (angle: number) => void;
  onApplyTransform?: (transform: SubjectTransform) => void;
  onApply: (blob: Blob) => void;
  onCancel: () => void;
}

const STAGE_MAX_WIDTH = 760;
const STAGE_MAX_HEIGHT = 500;
const STAGE_PADDING = 56;

// Preload the rotate icon from public/rotate.svg (browser-only, lazily created).
let rotateIconRef: HTMLImageElement | null = null;
function ensureRotateIcon(): HTMLImageElement | null {
  if (rotateIconRef) return rotateIconRef;
  if (typeof Image === 'undefined') return null;
  rotateIconRef = new Image();
  rotateIconRef.src = '/rotate.svg';
  return rotateIconRef;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
}

// 1. Diagonal corners: rounded circle handles with green stroke and clean shadow
function renderCircleCorner(
  this: any,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride: any,
  _fabricObject: any
) {
  const size = 14;
  ctx.save();
  ctx.translate(left, top);
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00C86A';
  ctx.stroke();
  ctx.restore();
}

// 2. Middle top & bottom: small horizontal rectangular box
function renderHorizontalRectControl(
  this: any,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride: any,
  fabricObject: any
) {
  const w = 18;
  const h = 7;
  const radius = 3;
  ctx.save();
  ctx.translate(left, top);
  const angleRad = ((fabricObject?.angle || 0) * Math.PI) / 180;
  ctx.rotate(angleRad);
  ctx.beginPath();
  drawRoundRect(ctx, -w / 2, -h / 2, w, h, radius);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#00C86A';
  ctx.stroke();
  ctx.restore();
}

// 3. Middle left & right: small vertical rectangular box
function renderVerticalRectControl(
  this: any,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride: any,
  fabricObject: any
) {
  const w = 7;
  const h = 18;
  const radius = 3;
  ctx.save();
  ctx.translate(left, top);
  const angleRad = ((fabricObject?.angle || 0) * Math.PI) / 180;
  ctx.rotate(angleRad);
  ctx.beginPath();
  drawRoundRect(ctx, -w / 2, -h / 2, w, h, radius);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#00C86A';
  ctx.stroke();
  ctx.restore();
}

// 4. Top side rotation handle: circular button with rotate.svg icon from public
function renderRotateControl(
  this: any,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride: any,
  fabricObject: any
) {
  const buttonRadius = 14;
  ctx.save();
  ctx.translate(left, top);

  // Rotate local coordinate system to align with object angle
  const angleRad = ((fabricObject?.angle || 0) * Math.PI) / 180;
  ctx.rotate(angleRad);

  // Subtle connector stem down to the top edge of the selection box
  ctx.beginPath();
  ctx.moveTo(0, buttonRadius);
  ctx.lineTo(0, 28);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#00C86A';
  ctx.stroke();

  // Outer button circle
  ctx.beginPath();
  ctx.arc(0, 0, buttonRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 2;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00C86A';
  ctx.stroke();

  // Draw rotate icon inside
  const icon = ensureRotateIcon();
  if (icon && icon.complete && icon.naturalWidth > 0) {
    const iconSize = 16;
    ctx.drawImage(icon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0.3 * Math.PI, 1.8 * Math.PI);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  ctx.restore();
}

const FabricImageEditor = forwardRef<FabricImageEditorHandle, FabricImageEditorProps>(function FabricImageEditor({
  imageUrl,
  artboardWidth,
  artboardHeight,
  naturalArtboardWidth,
  naturalArtboardHeight,
  mode,
  cropRatio,
  backgroundStyle,
  customBgColor,
  rotation = 0,
  initialScale = 1,
  initialRotation = 0,
  initialPosition = { x: 0, y: 0 },
  subjectTransform,
  hasCustomBg = false,
  cropTarget: controlledCropTarget,
  cropZoom: controlledCropZoom,
  onCropTargetChange,
  onCropZoomChange,
  onCropRatioChange,
  onRotationChange,
  onApplyTransform,
  onApply,
  onCancel,
}, ref) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const imageRef = useRef<FabricImage | null>(null);
  const cropRef = useRef<Rect | null>(null);
  const cropMasksRef = useRef<Rect[]>([]);
  const verticalGuideRef = useRef<Line | null>(null);
  const horizontalGuideRef = useRef<Line | null>(null);
  const naturalSizeRef = useRef({ width: 0, height: 0 });
  const ratioRef = useRef(cropRatio);
  const onCancelRef = useRef(onCancel);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [internalCropZoom, setInternalCropZoom] = useState(100);
  const [guides, setGuides] = useState({ x: false, y: false });
  const [internalCropTarget, setInternalCropTarget] = useState<'frame' | 'image'>('frame');
  const cropTarget = controlledCropTarget ?? internalCropTarget;
  const cropTargetRef = useRef<'frame' | 'image'>('frame');
  const cropPanRef = useRef<{ x: number; y: number } | null>(null);
  const baseScaleRef = useRef(1);
  const initialTransformRef = useRef<SubjectTransform>(subjectTransform || DEFAULT_SUBJECT_TRANSFORM);

  useEffect(() => {
    initialTransformRef.current = subjectTransform || DEFAULT_SUBJECT_TRANSFORM;
  }, [subjectTransform]);

  useEffect(() => {
    ratioRef.current = cropRatio;
  }, [cropRatio]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const canvasElement = canvasElementRef.current;
    if (!canvasElement) return;
    let disposed = false;
    setReady(false);

    const fabric = new FabricCanvas(canvasElement, {
      width: 1,
      height: 1,
      selection: false,
      preserveObjectStacking: true,
      enablePointerEvents: true,
      stopContextMenu: true,
      backgroundColor: 'transparent',
    });
    fabricRef.current = fabric;
    const rotateIcon = ensureRotateIcon();
    if (rotateIcon && !rotateIcon.complete) {
      rotateIcon.onload = () => {
        if (!disposed) fabric.requestRenderAll();
      };
    }

    const width = Math.max(1, Math.round(artboardWidth || STAGE_MAX_WIDTH));
    const height = Math.max(1, Math.round(artboardHeight || STAGE_MAX_HEIGHT));
    naturalSizeRef.current = {
      width: Math.max(1, Math.round(naturalArtboardWidth || width)),
      height: Math.max(1, Math.round(naturalArtboardHeight || height)),
    };

    const canvasWidth = width + STAGE_PADDING * 2;
    const canvasHeight = height + STAGE_PADDING * 2;
    fabric.setDimensions({ width: canvasWidth, height: canvasHeight });
    fabric.set({ selection: false });

    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((image) => {
      if (disposed) {
        image.dispose();
        return;
      }

      const cutoutWidth = image.width || 1;
      const cutoutHeight = image.height || 1;
      const fitFactor = hasCustomBg ? 0.75 : 1.0;
      const fit = Math.min((width * fitFactor) / cutoutWidth, (height * fitFactor) / cutoutHeight);
      baseScaleRef.current = fit;

      const canvasCenterX = STAGE_PADDING + width / 2;
      const canvasCenterY = STAGE_PADDING + height / 2;

      const tf = subjectTransform || DEFAULT_SUBJECT_TRANSFORM;
      const initialX = tf.relX * width;
      const initialY = tf.relY * height;
      const currentScale = fit * tf.scale;
      const initialAngle = tf.rotation || initialRotation || rotation;

      image.set({
        originX: 'center',
        originY: 'center',
        left: canvasCenterX + initialX,
        top: canvasCenterY + initialY,
        scaleX: currentScale,
        scaleY: currentScale,
        angle: initialAngle,
        flipX: tf.flipX,
        flipY: tf.flipY,
        lockUniScaling: true,
        snapAngle: 45,
        snapThreshold: 6,
        cornerStyle: 'circle',
        cornerColor: '#ffffff',
        cornerStrokeColor: '#00C86A',
        transparentCorners: false,
        cornerSize: 14,
        touchCornerSize: 28,
        borderColor: '#00C86A',
        borderScaleFactor: 2,
        borderDashArray: undefined,
        padding: 0,
        objectCaching: false,
      });

      // Diagonal corners: rounded circles
      image.controls.tl.render = renderCircleCorner;
      image.controls.tr.render = renderCircleCorner;
      image.controls.bl.render = renderCircleCorner;
      image.controls.br.render = renderCircleCorner;

      // Other edges: small rectangular boxes
      image.controls.ml.render = renderVerticalRectControl;
      image.controls.mr.render = renderVerticalRectControl;
      image.controls.mt.render = renderHorizontalRectControl;
      image.controls.mb.render = renderHorizontalRectControl;

      // Top rotate handle: rotate.svg icon from public
      image.controls.mtr.render = renderRotateControl;
      image.controls.mtr.offsetY = -28;
      image.controls.mtr.actionHandler = controlsUtils.rotationWithSnapping;

      // Restrict cutout image pixels to chessboard artboard canvas (with matching rounded corners)
      // Controls (selection borders, corner circles, rects, rotation handle) remain visible and active in STAGE_PADDING
      const artboardClip = new Rect({
        left: STAGE_PADDING,
        top: STAGE_PADDING,
        width,
        height,
        rx: 16,
        ry: 16,
        absolutePositioned: true,
      });
      image.clipPath = artboardClip;

      fabric.add(image);
      imageRef.current = image;

      const guideOptions = {
        stroke: '#00C86A',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      };
      const verticalGuide = new Line([canvasCenterX, STAGE_PADDING, canvasCenterX, STAGE_PADDING + height], { ...guideOptions, visible: false });
      const horizontalGuide = new Line([STAGE_PADDING, canvasCenterY, STAGE_PADDING + width, canvasCenterY], { ...guideOptions, visible: false });
      fabric.add(verticalGuide, horizontalGuide);
      verticalGuideRef.current = verticalGuide;
      horizontalGuideRef.current = horizontalGuide;

      if (mode === 'crop') {
        createCropFrame(fabric, width, height, ratioRef.current);
        fabric.on('mouse:down', (opt: any) => {
          if (cropTargetRef.current !== 'image') return;
          const pointer = opt.scenePoint || (typeof (fabric as any).getScenePoint === 'function' ? (fabric as any).getScenePoint(opt.e) : opt.e);
          cropPanRef.current = { x: pointer.x, y: pointer.y };
        });
        fabric.on('mouse:move', (opt: any) => {
          if (cropTargetRef.current !== 'image' || !cropPanRef.current || !imageRef.current) return;
          const pointer = opt.scenePoint || (typeof (fabric as any).getScenePoint === 'function' ? (fabric as any).getScenePoint(opt.e) : opt.e);
          const currentImg = imageRef.current;
          currentImg.set({
            left: (currentImg.left || 0) + pointer.x - cropPanRef.current.x,
            top: (currentImg.top || 0) + pointer.y - cropPanRef.current.y
          });
          currentImg.setCoords();
          cropPanRef.current = { x: pointer.x, y: pointer.y };
          fabric.requestRenderAll();
        });
        fabric.on('mouse:up', () => { cropPanRef.current = null; });
      } else {
        fabric.setActiveObject(image);
      }

      fabric.on('object:rotating', () => {
        if (imageRef.current) {
          const currentAngle = Math.round(imageRef.current.angle || 0);
          onRotationChange?.(currentAngle);
        }
      });

      const updateGuides = () => {
        const activeImage = imageRef.current;
        if (!activeImage || mode !== 'transform') return;
        const center = activeImage.getCenterPoint();
        const rect = activeImage.getBoundingRect();
        const epsilon = 7;
        const artboardLeft = STAGE_PADDING;
        const artboardTop = STAGE_PADDING;
        const artboardRight = STAGE_PADDING + width;
        const artboardBottom = STAGE_PADDING + height;

        const xSnaps = [
          { delta: canvasCenterX - center.x, active: Math.abs(canvasCenterX - center.x) <= epsilon },
          { delta: artboardLeft - rect.left, active: Math.abs(artboardLeft - rect.left) <= epsilon },
          { delta: artboardRight - (rect.left + rect.width), active: Math.abs(artboardRight - (rect.left + rect.width)) <= epsilon },
        ].filter((snap) => snap.active).sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
        const ySnaps = [
          { delta: canvasCenterY - center.y, active: Math.abs(canvasCenterY - center.y) <= epsilon },
          { delta: artboardTop - rect.top, active: Math.abs(artboardTop - rect.top) <= epsilon },
          { delta: artboardBottom - (rect.top + rect.height), active: Math.abs(artboardBottom - (rect.top + rect.height)) <= epsilon },
        ].filter((snap) => snap.active).sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
        const deltaX = xSnaps[0]?.delta || 0;
        const deltaY = ySnaps[0]?.delta || 0;
        let finalLeft = (activeImage.left || 0) + deltaX;
        let finalTop = (activeImage.top || 0) + deltaY;

        // Prevent image from completely overpassing the artboard boundaries
        const minMargin = 30;
        const curBounds = activeImage.getBoundingRect();
        if (curBounds.left + curBounds.width < artboardLeft + minMargin) {
          finalLeft += (artboardLeft + minMargin) - (curBounds.left + curBounds.width);
        } else if (curBounds.left > artboardRight - minMargin) {
          finalLeft -= curBounds.left - (artboardRight - minMargin);
        }
        if (curBounds.top + curBounds.height < artboardTop + minMargin) {
          finalTop += (artboardTop + minMargin) - (curBounds.top + curBounds.height);
        } else if (curBounds.top > artboardBottom - minMargin) {
          finalTop -= curBounds.top - (artboardBottom - minMargin);
        }

        activeImage.set({ left: finalLeft, top: finalTop });
        activeImage.setCoords();
        const showX = xSnaps.length > 0;
        const showY = ySnaps.length > 0;
        const snappedBounds = activeImage.getBoundingRect();
        const snappedCenter = activeImage.getCenterPoint();
        const xGuide = Math.abs(snappedCenter.x - canvasCenterX) <= epsilon ? canvasCenterX : Math.abs(snappedBounds.left - artboardLeft) <= epsilon ? artboardLeft : artboardRight;
        const yGuide = Math.abs(snappedCenter.y - canvasCenterY) <= epsilon ? canvasCenterY : Math.abs(snappedBounds.top - artboardTop) <= epsilon ? artboardTop : artboardBottom;
        verticalGuideRef.current?.set({ x1: xGuide, x2: xGuide, y1: artboardTop, y2: artboardBottom, visible: showX });
        horizontalGuideRef.current?.set({ y1: yGuide, y2: yGuide, x1: artboardLeft, x2: artboardRight, visible: showY });
        setGuides({ x: showX, y: showY });
        fabric.requestRenderAll();
      };
      const hideGuides = () => {
        verticalGuideRef.current?.set({ visible: false });
        horizontalGuideRef.current?.set({ visible: false });
        setGuides({ x: false, y: false });
        fabric.requestRenderAll();
      };
      fabric.on('object:moving', updateGuides);
      fabric.on('object:modified', hideGuides);
      fabric.on('mouse:up', hideGuides);
      fabric.requestRenderAll();
      setReady(true);
      setInternalCropTarget('frame');
      cropTargetRef.current = 'frame';
    }).catch((error: unknown) => {
      console.error('Could not initialize Fabric editor:', error);
      onCancelRef.current();
    });

    const moveWithKeyboard = (event: KeyboardEvent) => {
      if (mode !== 'transform' || !imageRef.current || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('button, input, select, textarea, [contenteditable="true"]')) return;
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      };
      const delta = deltas[event.key];
      if (!delta) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      imageRef.current.set({
        left: (imageRef.current.left || 0) + delta[0] * step,
        top: (imageRef.current.top || 0) + delta[1] * step,
      });
      imageRef.current.setCoords();
      fabric.requestRenderAll();
    };
    window.addEventListener('keydown', moveWithKeyboard);

    return () => {
      disposed = true;
      window.removeEventListener('keydown', moveWithKeyboard);
      fabric.dispose();
      fabricRef.current = null;
      imageRef.current = null;
      cropRef.current = null;
      cropMasksRef.current = [];
      cropPanRef.current = null;
      verticalGuideRef.current = null;
      horizontalGuideRef.current = null;
    };
  }, [imageUrl, mode, artboardWidth, artboardHeight, naturalArtboardWidth, naturalArtboardHeight]);

  useEffect(() => {
    const fabric = fabricRef.current;
    if (!fabric || !ready || mode !== 'crop') return;
    const width = Math.max(1, Math.round(artboardWidth || STAGE_MAX_WIDTH));
    const height = Math.max(1, Math.round(artboardHeight || STAGE_MAX_HEIGHT));
    createCropFrame(fabric, width, height, cropRatio);
    if (cropTarget === 'image') selectCropImage();
  }, [cropRatio, mode, ready, artboardWidth, artboardHeight]);

  // Synchronize rotation prop
  useEffect(() => {
    if (typeof rotation === 'number' && imageRef.current && fabricRef.current) {
      if (Math.round(imageRef.current.angle || 0) !== Math.round(rotation)) {
        imageRef.current.set({ angle: rotation });
        imageRef.current.setCoords();
        fabricRef.current.requestRenderAll();
      }
    }
  }, [rotation]);

  // Synchronize controlled crop target
  useEffect(() => {
    if (controlledCropTarget && controlledCropTarget !== cropTargetRef.current) {
      if (controlledCropTarget === 'frame') {
        selectCropFrame();
      } else {
        selectCropImage();
      }
    }
  }, [controlledCropTarget]);

  // Synchronize controlled crop zoom
  useEffect(() => {
    if (typeof controlledCropZoom === 'number' && controlledCropZoom !== internalCropZoom) {
      applyCropZoom(controlledCropZoom);
    }
  }, [controlledCropZoom]);

  function createCropFrame(fabric: FabricCanvas, width: number, height: number, ratio: FabricCropRatio) {
    const frame = cropRef.current;
    if (frame) fabric.remove(frame);
    cropMasksRef.current.forEach((mask) => fabric.remove(mask));
    cropMasksRef.current = [];

    const targetRatio = ratio === 'free' ? width / height : ratioValue(ratio);
    let frameWidth = width * 0.84;
    let frameHeight = frameWidth / targetRatio;
    if (frameHeight > height * 0.84) {
      frameHeight = height * 0.84;
      frameWidth = frameHeight * targetRatio;
    }

    const crop = new Rect({
      left: STAGE_PADDING + (width - frameWidth) / 2,
      top: STAGE_PADDING + (height - frameHeight) / 2,
      width: frameWidth,
      height: frameHeight,
      fill: 'transparent',
      stroke: '#00C86A',
      strokeWidth: 2,
      strokeUniform: true,
      hasBorders: false,
      cornerStyle: 'circle',
      cornerColor: '#ffffff',
      cornerStrokeColor: '#00C86A',
      transparentCorners: false,
      cornerSize: 14,
      touchCornerSize: 28,
      borderColor: '#00C86A',
      borderScaleFactor: 2,
      borderDashArray: undefined,
      padding: 0,
      lockRotation: true,
      lockUniScaling: ratio !== 'free',
      hasRotatingPoint: false,
      objectCaching: false,
      excludeFromExport: true,
      selectable: true,
      evented: true,
    });

    const verticalEdgeHandler = ratio === 'free' ? controlsUtils.scalingX : controlsUtils.scalingEqually;
    const horizontalEdgeHandler = ratio === 'free' ? controlsUtils.scalingY : controlsUtils.scalingEqually;
    crop.controls.ml.actionHandler = controlsUtils.wrapWithFixedAnchor(verticalEdgeHandler);
    crop.controls.mr.actionHandler = controlsUtils.wrapWithFixedAnchor(verticalEdgeHandler);
    crop.controls.mt.actionHandler = controlsUtils.wrapWithFixedAnchor(horizontalEdgeHandler);
    crop.controls.mb.actionHandler = controlsUtils.wrapWithFixedAnchor(horizontalEdgeHandler);

    // Diagonal corners: rounded circles
    crop.controls.tl.render = renderCircleCorner;
    crop.controls.tr.render = renderCircleCorner;
    crop.controls.bl.render = renderCircleCorner;
    crop.controls.br.render = renderCircleCorner;

    // Other edges: small rectangular boxes
    crop.controls.ml.render = renderVerticalRectControl;
    crop.controls.mr.render = renderVerticalRectControl;
    crop.controls.mt.render = renderHorizontalRectControl;
    crop.controls.mb.render = renderHorizontalRectControl;

    fabric.add(crop);
    cropRef.current = crop;

    const maskOptions = {
      fill: 'rgba(0,0,0,0.5)',
      selectable: false,
      evented: false,
      excludeFromExport: true,
      objectCaching: false,
    };
    cropMasksRef.current = Array.from({ length: 4 }, () => new Rect({ ...maskOptions, width: 0, height: 0 }));
    cropMasksRef.current.forEach((mask) => fabric.add(mask));

    const clampCropBounds = () => {
      crop.setCoords();
      let scaledW = crop.getScaledWidth();
      let scaledH = crop.getScaledHeight();

      // Clamp dimensions to artboard size
      if (scaledW > width) {
        crop.scaleX = width / crop.width;
        scaledW = width;
      }
      if (scaledH > height) {
        crop.scaleY = height / crop.height;
        scaledH = height;
      }

      // Clamp position within [STAGE_PADDING, STAGE_PADDING + width - scaledW] and [STAGE_PADDING, STAGE_PADDING + height - scaledH]
      let newLeft = crop.left || STAGE_PADDING;
      let newTop = crop.top || STAGE_PADDING;
      if (newLeft < STAGE_PADDING) newLeft = STAGE_PADDING;
      if (newTop < STAGE_PADDING) newTop = STAGE_PADDING;
      if (newLeft + scaledW > STAGE_PADDING + width) newLeft = Math.max(STAGE_PADDING, STAGE_PADDING + width - scaledW);
      if (newTop + scaledH > STAGE_PADDING + height) newTop = Math.max(STAGE_PADDING, STAGE_PADDING + height - scaledH);

      crop.set({ left: newLeft, top: newTop });
      crop.setCoords();
    };

    const updateCropMasks = () => {
      clampCropBounds();
      const bounds = crop.getBoundingRect();
      const artboardLeft = STAGE_PADDING;
      const artboardTop = STAGE_PADDING;
      const artboardRight = STAGE_PADDING + width;
      const artboardBottom = STAGE_PADDING + height;
      const maskRects = [
        { left: artboardLeft, top: artboardTop, width, height: Math.max(0, bounds.top - artboardTop) },
        { left: artboardLeft, top: bounds.top + bounds.height, width, height: Math.max(0, artboardBottom - (bounds.top + bounds.height)) },
        { left: artboardLeft, top: bounds.top, width: Math.max(0, bounds.left - artboardLeft), height: bounds.height },
        { left: bounds.left + bounds.width, top: bounds.top, width: Math.max(0, artboardRight - (bounds.left + bounds.width)), height: bounds.height },
      ];
      cropMasksRef.current.forEach((mask, index) => {
        mask.set(maskRects[index]);
        mask.setCoords();
      });
      cropMasksRef.current.forEach((mask) => fabric.sendObjectToBack(mask));
      if (imageRef.current) fabric.sendObjectToBack(imageRef.current);
      fabric.bringObjectToFront(crop);
      cropMasksRef.current.forEach((mask) => fabric.bringObjectToFront(mask));
      fabric.bringObjectToFront(crop);
    };
    crop.on('moving', updateCropMasks);
    crop.on('scaling', updateCropMasks);
    updateCropMasks();
    setInternalCropTarget('frame');
    cropTargetRef.current = 'frame';
    onCropTargetChange?.('frame');
    fabric.setActiveObject(crop);
    fabric.requestRenderAll();
  }

  function selectCropImage() {
    const fabric = fabricRef.current;
    const image = imageRef.current;
    if (!fabric || !image) return;
    cropRef.current?.set({ selectable: false, evented: false });
    // Less visible, reduced opacity border when moving image
    image.set({
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: true,
      borderColor: 'rgba(0, 200, 106, 0.35)',
      borderScaleFactor: 1,
      borderDashArray: [4, 4],
      padding: 0,
      lockScalingX: true,
      lockScalingY: true,
    });
    cropMasksRef.current.forEach((mask) => mask.set({ evented: false }));
    fabric.setActiveObject(image);
    setInternalCropTarget('image');
    cropTargetRef.current = 'image';
    onCropTargetChange?.('image');
    fabric.requestRenderAll();
  }

  function selectCropFrame() {
    const fabric = fabricRef.current;
    const frame = cropRef.current;
    const image = imageRef.current;
    if (!fabric || !frame || !image) return;
    image.set({
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      borderColor: '#00C86A',
      borderScaleFactor: 2,
      borderDashArray: undefined,
    });
    frame.set({ selectable: true, evented: true, hasBorders: false, hasControls: true });
    cropMasksRef.current.forEach((mask) => mask.set({ selectable: false, evented: false }));
    cropMasksRef.current.forEach((mask) => fabric.sendObjectToBack(mask));
    fabric.sendObjectToBack(image);
    fabric.bringObjectToFront(frame);
    fabric.setActiveObject(frame);
    setInternalCropTarget('frame');
    cropTargetRef.current = 'frame';
    onCropTargetChange?.('frame');
    fabric.requestRenderAll();
  }

  function ratioValue(ratio: FabricCropRatio) {
    if (ratio === 'free') return 1;
    const [width, height] = ratio.split(':').map(Number);
    return width / height;
  }

  function applyCropZoom(zoom: number) {
    const image = imageRef.current;
    const fabric = fabricRef.current;
    if (!image || !fabric) return;
    const width = Math.max(1, Math.round(artboardWidth || STAGE_MAX_WIDTH));
    const height = Math.max(1, Math.round(artboardHeight || STAGE_MAX_HEIGHT));
    const canvasCenterX = STAGE_PADDING + width / 2;
    const canvasCenterY = STAGE_PADDING + height / 2;
    const baseScale = baseScaleRef.current || 1;
    const targetScale = baseScale * (zoom / 100);
    const prevScale = image.scaleX || baseScale;
    const scaleRatio = targetScale / (prevScale || 1);
    const cropBounds = cropRef.current?.getBoundingRect();
    const anchor = cropBounds
      ? { x: cropBounds.left + cropBounds.width / 2, y: cropBounds.top + cropBounds.height / 2 }
      : { x: canvasCenterX, y: canvasCenterY };

    image.set({
      left: anchor.x + ((image.left || 0) - anchor.x) * scaleRatio,
      top: anchor.y + ((image.top || 0) - anchor.y) * scaleRatio,
      scaleX: targetScale,
      scaleY: targetScale,
    });
    image.setCoords();
    fabric.requestRenderAll();
    setInternalCropZoom(zoom);
    onCropZoomChange?.(zoom);
  }

  async function apply() {
    const fabric = fabricRef.current;
    const image = imageRef.current;
    if (!fabric || !image) return;
    setBusy(true);

    try {
      const width = Math.max(1, Math.round(artboardWidth || STAGE_MAX_WIDTH));
      const height = Math.max(1, Math.round(artboardHeight || STAGE_MAX_HEIGHT));
      const canvasCenterX = STAGE_PADDING + width / 2;
      const canvasCenterY = STAGE_PADDING + height / 2;

      if (mode === 'crop' && cropRef.current) {
        const bounds = cropRef.current.getBoundingRect();
        const multiplier = naturalSizeRef.current.width / width;
        const prevClip = image.clipPath;
        image.clipPath = undefined;
        const output = fabric.toCanvasElement(multiplier, {
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
          filter: (object) => object === image,
        });
        image.clipPath = prevClip;
        fabric.setActiveObject(cropRef.current);
        fabric.requestRenderAll();

        const blob = await new Promise<Blob>((resolve, reject) => {
          output.toBlob((value) => value ? resolve(value) : reject(new Error('Could not render crop edit')), 'image/png');
        });
        onApply(blob);
      } else {
        const currentFit = baseScaleRef.current || 1;
        const currentScaleX = Math.abs(image.scaleX || currentFit);
        const newTransform: SubjectTransform = {
          relX: Number((((image.left || 0) - canvasCenterX) / width).toFixed(4)),
          relY: Number((((image.top || 0) - canvasCenterY) / height).toFixed(4)),
          scale: Number((currentScaleX / currentFit).toFixed(3)),
          rotation: Math.round(image.angle || 0),
          flipX: !!image.flipX,
          flipY: !!image.flipY,
        };

        if (onApplyTransform) {
          onApplyTransform(newTransform);
        } else {
          const { width: naturalW } = naturalSizeRef.current;
          const prevClip = image.clipPath;
          image.clipPath = undefined;
          const output = fabric.toCanvasElement(naturalW / width, {
            left: STAGE_PADDING,
            top: STAGE_PADDING,
            width,
            height,
            filter: (object) => object === image,
          });
          image.clipPath = prevClip;
          cropMasksRef.current = [];
          const blob = await new Promise<Blob>((resolve, reject) => {
            output.toBlob((value) => value ? resolve(value) : reject(new Error('Could not render image edit')), 'image/png');
          });
          onApply(blob);
        }
      }
    } catch (error) {
      console.error('Could not apply Fabric edit:', error);
    } finally {
      setBusy(false);
    }
  }

  function flip(axis: 'x' | 'y') {
    const image = imageRef.current;
    const fabric = fabricRef.current;
    if (!image || !fabric) return;
    image.set(axis === 'x' ? 'flipX' : 'flipY', !(axis === 'x' ? image.flipX : image.flipY));
    image.setCoords();
    fabric.requestRenderAll();
  }

  function resetTransform() {
    const fabric = fabricRef.current;
    const image = imageRef.current;
    if (!fabric || !image) return;
    const width = Math.max(1, Math.round(artboardWidth || STAGE_MAX_WIDTH));
    const height = Math.max(1, Math.round(artboardHeight || STAGE_MAX_HEIGHT));
    const canvasCenterX = STAGE_PADDING + width / 2;
    const canvasCenterY = STAGE_PADDING + height / 2;
    const fit = baseScaleRef.current || 1;
    image.set({
      left: canvasCenterX,
      top: canvasCenterY,
      scaleX: fit,
      scaleY: fit,
      angle: 0,
      flipX: false,
      flipY: false,
    });
    image.setCoords();
    fabric.requestRenderAll();
    onRotationChange?.(0);
    onApplyTransform?.(DEFAULT_SUBJECT_TRANSFORM);
  }

  function restoreInitialTransform() {
    const fabric = fabricRef.current;
    const image = imageRef.current;
    if (!fabric || !image) return;
    const width = Math.max(1, Math.round(artboardWidth || STAGE_MAX_WIDTH));
    const height = Math.max(1, Math.round(artboardHeight || STAGE_MAX_HEIGHT));
    const canvasCenterX = STAGE_PADDING + width / 2;
    const canvasCenterY = STAGE_PADDING + height / 2;
    const fit = baseScaleRef.current || 1;
    const tf = initialTransformRef.current || DEFAULT_SUBJECT_TRANSFORM;
    const initialX = tf.relX * width;
    const initialY = tf.relY * height;
    const currentScale = fit * tf.scale;
    const initialAngle = tf.rotation || initialRotation || rotation;
    image.set({
      left: canvasCenterX + initialX,
      top: canvasCenterY + initialY,
      scaleX: currentScale,
      scaleY: currentScale,
      angle: initialAngle,
      flipX: tf.flipX,
      flipY: tf.flipY,
    });
    image.setCoords();
    fabric.requestRenderAll();
    onRotationChange?.(initialAngle);
  }

  useImperativeHandle(ref, () => ({
    flipX: () => flip('x'),
    flipY: () => flip('y'),
    resetTransform: () => resetTransform(),
    apply: () => apply(),
    cancel: () => {
      restoreInitialTransform();
      onCancelRef.current?.();
    },
    selectCropFrame: () => selectCropFrame(),
    selectCropImage: () => selectCropImage(),
    setCropZoom: (z: number) => applyCropZoom(z),
    setRotation: (angle: number) => {
      if (imageRef.current && fabricRef.current) {
        imageRef.current.set({ angle });
        imageRef.current.setCoords();
        fabricRef.current.requestRenderAll();
      }
    },
    getCurrentTransform: () => {
      const img = imageRef.current;
      const fab = fabricRef.current;
      if (!img || !fab) return null;
      const width = Math.max(1, Math.round(artboardWidth || STAGE_MAX_WIDTH));
      const height = Math.max(1, Math.round(artboardHeight || STAGE_MAX_HEIGHT));
      const canvasCenterX = STAGE_PADDING + width / 2;
      const canvasCenterY = STAGE_PADDING + height / 2;
      const fit = baseScaleRef.current || 1;
      return {
        relX: Number((((img.left || 0) - canvasCenterX) / width).toFixed(4)),
        relY: Number((((img.top || 0) - canvasCenterY) / height).toFixed(4)),
        scale: Number((Math.abs(img.scaleX || fit) / fit).toFixed(3)),
        rotation: Math.round(img.angle || 0),
        flipX: !!img.flipX,
        flipY: !!img.flipY,
      };
    },
  }), []);

  const width = Math.max(1, Math.round(artboardWidth || STAGE_MAX_WIDTH));
  const height = Math.max(1, Math.round(artboardHeight || STAGE_MAX_HEIGHT));
  const canvasWidth = width + STAGE_PADDING * 2;
  const canvasHeight = height + STAGE_PADDING * 2;

  return (
    <div
      className="absolute flex items-center justify-center overflow-visible select-none pointer-events-auto"
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        left: `-${STAGE_PADDING}px`,
        top: `-${STAGE_PADDING}px`,
      }}
    >
      <canvas
        ref={canvasElementRef}
        className="touch-none"
        style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
        aria-label={mode === 'crop' ? 'Crop image with Fabric controls' : 'Transform image with Fabric controls'}
      />
      {mode === 'transform' && ready && (guides.x || guides.y) && (
        <span
          className="pointer-events-none absolute z-20 rounded bg-black/70 px-2 py-1 text-[10px] font-bold text-[#00FF85]"
          style={{ right: `${STAGE_PADDING + 12}px`, top: `${STAGE_PADDING + 12}px` }}
        >
          Aligned
        </span>
      )}
      {!ready && <span className="absolute text-xs font-semibold text-white/55">Preparing editor…</span>}
    </div>
  );
});

export default FabricImageEditor;