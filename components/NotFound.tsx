'use client';

import React from "react";
import '@/styles/not-found.css';

interface NotFoundProps {
  onGoHome?: () => void;
}

export default function NotFound({ onGoHome }: NotFoundProps) {
  const handleHome = () => {
    if (onGoHome) {
      onGoHome();
      return;
    }

    window.location.href = "/";
  };

  return (
    <main className="not-found-page">
      {/* Background decoration */}
      <div className="not-found-grid" />
      <div className="not-found-glow not-found-glow-one" />
      <div className="not-found-glow not-found-glow-two" />

      <div className="not-found-content">

        {/* Ghost */}
        <div className="ghost-wrapper">
          <div className="ghost">
            <div className="ghost-body">

              <div className="ghost-pupil" />
              <div className="ghost-pupil ghost-pupil-right" />

              <div className="ghost-eye" />
              <div className="ghost-eye ghost-eye-right" />

              <div className="ghost-top ghost-top-0" />
              <div className="ghost-top ghost-top-1" />
              <div className="ghost-top ghost-top-2" />
              <div className="ghost-top ghost-top-3" />
              <div className="ghost-top ghost-top-4" />

              <div className="ghost-star ghost-star-0" />
              <div className="ghost-star ghost-star-1" />
              <div className="ghost-star ghost-star-2" />
              <div className="ghost-star ghost-star-3" />
              <div className="ghost-star ghost-star-4" />
              <div className="ghost-star ghost-star-5" />

              <div className="ghost-anim ghost-anim-1" />
              <div className="ghost-anim ghost-anim-2" />
              <div className="ghost-anim ghost-anim-3" />
              <div className="ghost-anim ghost-anim-4" />
              <div className="ghost-anim ghost-anim-5" />
              <div className="ghost-anim ghost-anim-6" />
              <div className="ghost-anim ghost-anim-7" />
              <div className="ghost-anim ghost-anim-8" />
              <div className="ghost-anim ghost-anim-9" />
              <div className="ghost-anim ghost-anim-10" />
              <div className="ghost-anim ghost-anim-11" />
              <div className="ghost-anim ghost-anim-12" />
              <div className="ghost-anim ghost-anim-13" />
              <div className="ghost-anim ghost-anim-14" />
              <div className="ghost-anim ghost-anim-15" />
              <div className="ghost-anim ghost-anim-16" />
              <div className="ghost-anim ghost-anim-17" />
              <div className="ghost-anim ghost-anim-18" />

            </div>

            <div className="ghost-shadow" />
          </div>
        </div>

        {/* 404 */}
        <div className="not-found-number">
          404
        </div>

        {/* Heading */}
        <h1 className="not-found-title">
          Page not found
        </h1>

        <p className="not-found-description">
          Looks like this pixel wandered off.
          <br className="not-found-break" />
          The page you're looking for doesn't exist.
        </p>

        {/* Actions */}
        <div className="not-found-actions">
          <button
            type="button"
            onClick={handleHome}
            className="not-found-home-button"
          >
            <span className="not-found-home-icon">
              ←
            </span>

            <span>Back to home</span>
          </button>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="not-found-back-button"
          >
            Go back
          </button>
        </div>

        {/* Bottom status */}
        <div className="not-found-status">
          <span className="not-found-status-dot" />
          <span>PIXELIFY</span>
          <span className="not-found-status-separator">/</span>
          <span>NOT FOUND</span>
        </div>

      </div>
    </main>
  );
}