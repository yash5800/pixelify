'use client';

import { useCallback, useEffect } from 'react';
import { useApp } from '../AppProvider';
import Footer from '../Footer';
import BGRemoveWorkspace from '../BGRemoveWorkspace';
import Bgmarquee from '../bgremove/Bgmarquee';
import { BgSampleGallery, BgShowcase, BgPipeline, BgPrecision, BgFaq } from '../bgremove/BgSections';
import DeviceRecommendationNotice from '../DeviceRecommendationNotice';
import { bgRemoverService } from '../../services/bgRemoverService';

export default function BgRemoveView() {
  const {
    navigateTo,
    addToast,
    bgJobs,
    setBgJobs,
    handleBGFiles,
    openPicker,
    setBgEngine,
    setBgWebgpuAvailable,
    loadBgSample,
  } = useApp();

  // Leaving the BG Remover tab should not leave the model's WASM/GPU arena
  // resident in the renderer; the weights stay cached for an instant reload.
  useEffect(() => () => bgRemoverService.recycleIdleWorker(), []);

  // Stable identity: an inline callback here re-ran the workspace init effect
  // on every provider render, which could restart the model download right
  // after the user cleared the cache.
  const handleEngineReport = useCallback(
    (engine: 'wasm' | 'webgpu', webgpuAvailable: boolean) => {
      setBgEngine(engine);
      setBgWebgpuAvailable(webgpuAvailable);
    },
    [setBgEngine, setBgWebgpuAvailable]
  );

  return (
    <div className="flex flex-col gap-8 w-full px-2">
      <DeviceRecommendationNotice tool="bg_remove" />

      <BGRemoveWorkspace
        jobs={bgJobs}
        setJobs={setBgJobs}
        addToast={addToast}
        onFileAdd={handleBGFiles}
        onOpenPicker={openPicker}
        onEngineReport={handleEngineReport}
      />
      {bgJobs.length === 0 && (
        <>
          <BgShowcase />
          <Bgmarquee />
          <BgPipeline />
          <BgPrecision />
          <BgSampleGallery onLoadSample={loadBgSample} />
          <BgFaq />
        </>
      )}
      <Footer onTabChange={navigateTo} />
    </div>
  );
}
