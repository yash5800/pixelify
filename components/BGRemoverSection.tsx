import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from './AppProvider';

interface BGRemoverSectionProps {
    onLaunchBGRemove: () => void;
}

export default function BGRemoverSection({ onLaunchBGRemove }: BGRemoverSectionProps) {
    const [activeTab, setActiveTab] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const { warmup } = useApp();

    return (
        <section className="w-screen max-w-[100vw] relative left-1/2 -translate-x-1/2 rounded-[28px] sm:rounded-[44px] bg-white text-neutral-900 py-10 sm:py-12 lg:py-14 px-4 sm:px-8 lg:px-12 shadow-[0_30px_100px_rgba(0,0,0,0.7)] relative z-20 overflow-hidden">
            {/* Scoped styles replicating the exact 3D tilt & pop-out animation from ztest.html */}
            <style dangerouslySetInnerHTML={{ __html: `
        .bgr-3d-wrapper {
          position: relative;
          height: 360px;
          width: 100%;
          max-width: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 900px;
        }

        @media (min-width: 480px) {
          .bgr-3d-wrapper {
            height: 440px;
            max-width: 400px;
          }
        }

        @media (min-width: 640px) {
          .bgr-3d-wrapper {
            height: 560px;
            max-width: 480px;
          }
        }

        .bgr-3d-card {
          position: relative;
          height: 100%;
          width: 90%;
          text-align: center;
          transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.35s ease, height 0.35s ease;
          border-radius: 24px;
        }

        .bgr-3d-wrapper:hover .bgr-3d-card,
        .bgr-3d-wrapper.is-hovered .bgr-3d-card {
          transform: rotateX(48deg);
          transform-origin: bottom;
          filter: brightness(30%);
          height: 98%;
        }

        .bgr-3d-card img {
          height: 100%;
          width: 100%;
          border: 4px solid #fff;
          border-radius: 24px;
          object-fit: cover;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.04);
        }

        .bgr-3d-popup {
          position: absolute;
          height: 100%;
          width: 100%;
          pointer-events: none;
        }

        .bgr-3d-popup img {
          position: absolute;
          height: 82%;
          top: 50%;
          left: 50%;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.72);
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
          transition-delay: 0s;
          filter: drop-shadow(0 25px 35px rgba(0, 0, 0, 0.65));
        }

        .bgr-3d-wrapper:hover .bgr-3d-popup img,
        .bgr-3d-wrapper.is-hovered .bgr-3d-popup img {
          transform: translate(-50%, -50%) scale(1.2);
          transition-delay: 0.15s;
          opacity: 1;
        }
      `}} />

            <div className="max-w-[1300px] mx-auto flex flex-col gap-6 sm:gap-8 lg:gap-5">
                {/* ========================================================================= */}
                {/* SECTION HEADING: CENTERED & BEAUTIFUL WITHOUT CHANGING ITS TEXT          */}
                {/* ========================================================================= */}
                <div className="flex flex-col items-center justify-center text-center">
                    <h2 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-[38px] font-extrabold tracking-tight text-neutral-950 leading-tight">
                        Precision Background Removal{' '}
                        <span className="text-[#00C86A]">with AI</span>
                    </h2>
                </div>

                {/* ========================================================================= */}
                {/* 2-COLUMN CONTENT GRID                                                     */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">
                    {/* ========================================================================= */}
                    {/* LEFT COLUMN: 3 TIERED STATEMENTS MATCHING REFERENCE UI */}
                    {/* ========================================================================= */}
                    <div className="lg:col-span-6 flex flex-col gap-6 sm:gap-10">
                        {/* 3 Tiered Headline Items */}
                        <div className="flex flex-col gap-5 sm:gap-8">
                            {/* Item 1 - Active Highlighted */}
                            <div
                                onClick={() => setActiveTab(0)}
                                className="cursor-pointer transition-all duration-300 select-none group"
                            >
                                <h3
                                    className={`text-xl sm:text-2xl lg:text-[32px] xl:text-[36px] font-bold tracking-tight transition-colors duration-300 leading-tight ${activeTab === 0 ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-600'
                                        }`}
                                >
                                    <span className={activeTab === 0 ? 'text-[#00C86A]' : ''}>100% Free </span>and unlimited.
                                </h3>
                                {activeTab === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="mt-3 flex flex-col gap-2 sm:gap-3 max-w-lg"
                                    >
                                        <p className="text-xs sm:text-sm lg:text-base text-neutral-600 font-normal leading-relaxed">
                                            Remove backgrounds from portraits, product photos, and complex images in seconds. No tedious manual selection or paid credits required.
                                        </p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Item 2 */}
                            <div
                                onClick={() => setActiveTab(1)}
                                className="cursor-pointer transition-all duration-300 select-none group"
                            >
                                <h3
                                    className={`text-xl sm:text-2xl lg:text-[32px] xl:text-[36px] font-bold tracking-tight transition-colors duration-300 leading-tight ${activeTab === 1 ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-600'
                                        }`}
                                >
                                    <span className={activeTab === 1 ? 'text-[#00C86A]' : ''}>On-Device Privacy</span> with zero cloud uploads.
                                </h3>
                                {activeTab === 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="mt-3 flex flex-col gap-2 sm:gap-3 max-w-lg"
                                    >
                                        <p className="text-xs sm:text-sm lg:text-base text-neutral-600 font-normal leading-relaxed">
                                           Your images stay on your device while the AI processes them in your browser. Enjoy a more private workflow without uploading photos to a server.
                                        </p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Item 3 */}
                            <div
                                onClick={() => setActiveTab(2)}
                                className="cursor-pointer transition-all duration-300 select-none group"
                            >
                                <h3
                                    className={`text-xl sm:text-2xl lg:text-[32px] xl:text-[36px] font-bold tracking-tight transition-colors duration-300 leading-tight ${activeTab === 2 ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-600'
                                        }`}
                                >
                                    <span className={activeTab === 2 ? 'text-[#00C86A]' : ''}>Custom Backdrops</span> & full original resolution export.
                                </h3>
                                {activeTab === 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="mt-3 flex flex-col gap-2 sm:gap-3 max-w-lg"
                                    >
                                        <p className="text-xs sm:text-sm lg:text-base text-neutral-600 font-normal leading-relaxed">
                                            Download crisp transparent PNG cutouts or give your images a new background. Export at the original image dimensions, ready for websites, stores, and creative projects.
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Action CTA Button (Desktop only, positioned under text) */}
                        <div className="hidden lg:flex pt-1 sm:pt-2 lg:pt-2 flex-col sm:flex-row items-center lg:items-start gap-3 sm:gap-4 w-full sm:w-auto">
                            <button
                                onClick={onLaunchBGRemove}
                                onMouseEnter={() => warmup('bg_remove')}
                                className="w-fit justify-center px-6 py-3.5 rounded-full bg-neutral-950 hover:bg-black text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 group cursor-pointer"
                            >
                                <span>Explore BG Remover</span>
                                <span className="text-[#00FF85] group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* RIGHT COLUMN: EXACT 3D POP-OUT CUTOUT ANIMATION FROM ztest.html           */}
                    {/* ========================================================================= */}
                    <div className="lg:col-span-6 flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6 gap-5 sm:gap-6">
                        <div
                            onClick={() => setIsHovered(!isHovered)}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className={`bgr-3d-wrapper cursor-pointer select-none ${isHovered ? 'is-hovered' : ''}`}
                        >
                            {/* Tilt Card (Original Photo) */}
                            <div className="bgr-3d-card">
                                <img src="/home/bgremover/bg-img.jpg" alt="Original Photo" />
                            </div>

                            {/* Popup Cutout (Background Removed PNG) */}
                            <div className="bgr-3d-popup">
                                <img src="/home/bgremover/bg-removed.png" alt="Background Removed Cutout" />
                            </div>
                        </div>

                        {/* Mobile Action CTA Button (below image on mobile) */}
                        <div className="flex lg:hidden justify-center w-full z-20">
                            <button
                                onClick={onLaunchBGRemove}
                                onMouseEnter={() => warmup('bg_remove')}
                                onTouchStart={() => warmup('bg_remove')}
                                className="w-fit justify-center px-6 py-3.5 rounded-full bg-neutral-950 hover:bg-black text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 group cursor-pointer"
                            >
                                <span>Explore BG Remover</span>
                                <span className="text-[#00FF85] group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
