'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

const ROW_ONE = [
  { src: '/home/shots/wheel-gel-a.jpg', label: 'Gel portrait · Vitality 4×' },
  { src: '/home/shots/wheel-blue-car.jpg', label: 'Blue coupe · Pixel-Dance 4×' },
  { src: '/home/shots/wheel-dog-bw.jpg', label: 'Retriever · Alpha-Satoru 4×' },
  { src: '/home/shots/wheel-white-car.jpg', label: 'Coupe · Alpha-Satoru 4×' },
  { src: '/home/shots/wheel-gel-b.jpg', label: 'Studio set · Vitality 4×' },
  { src: '/home/shots/wheel-orange-car.jpg', label: 'Night drive · Pixel-Dance 4×' },
  { src: '/home/shots/wheel-dog.jpg', label: 'Retriever · Chopper cutout' },
  { src: '/home/shots/wheel-gel-c.jpg', label: 'Studio set · Vitality 4×' },
];

const ROW_TWO = [
  { src: '/home/shots/wheel-editorial.jpg', label: 'Editorial · Alpha-Satoru 4×' },
  { src: '/home/shots/cut-sneaker.webp', label: 'Runner · Chopper cutout' },
  { src: '/home/shots/cut-gel.webp', label: 'Studio cutout · Chopper' },
  { src: '/home/shots/on-set.jpg', label: 'On set · Vitality 4×' },
  { src: '/home/shots/wheel-gel-b.jpg', label: 'Studio set · Pixel-Dance 4×' },
  { src: '/home/shots/wheel-blue-car.jpg', label: 'Blue coupe · Pixel-Dance 4×' },
];

/** Scroll-driven filmstrip of real Pixelify results, echoing Framer's image wheel. */
export function ImageWheel() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const xOne = useTransform(scrollYProgress, [0, 1], ['2%', '-12%']);
  const xTwo = useTransform(scrollYProgress, [0, 1], ['-12%', '2%']);
  const rotate = useTransform(scrollYProgress, [0, 1], [-1.4, 1.4]);

  return (
    <div className="fh-wheel" ref={ref}>
      <motion.div
        className="fh-wheel-row"
        style={reduce ? undefined : { x: xOne, rotate }}
      >
        {[...ROW_ONE, ...ROW_ONE].map((card, index) => (
          <div
            className="fh-wheel-card"
            key={`one-${index}`}
            aria-hidden={index >= ROW_ONE.length}
          >
            <img src={card.src} alt={index < ROW_ONE.length ? card.label : ''} loading="lazy" />
          </div>
        ))}
      </motion.div>

      <motion.div
        className="fh-wheel-row"
        style={reduce ? undefined : { x: xTwo, rotate }}
      >
        {[...ROW_TWO, ...ROW_TWO].map((card, index) => (
          <div
            className="fh-wheel-card"
            key={`two-${index}`}
            aria-hidden={index >= ROW_TWO.length}
          >
            <img src={card.src} alt={index < ROW_TWO.length ? card.label : ''} loading="lazy" />
          </div>
        ))}
      </motion.div>

      <span className="fh-wheel-caption">
        <i aria-hidden="true" />
        Real runs · 4× upscales and Chopper cutouts
      </span>
    </div>
  );
}
