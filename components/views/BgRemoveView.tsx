'use client';

import { useApp } from '../AppProvider';
import Footer from '../Footer';
import BGRemoveWorkspace from '../BGRemoveWorkspace';
import Bgmarquee from '../bgremove/Bgmarquee';
import { BgSampleGallery, BgShowcase, BgPipeline, BgPrecision, BgFaq } from '../bgremove/BgSections';
import DeviceRecommendationNotice from '../DeviceRecommendationNotice';

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

  return (
    <div className="w-full flex flex-col gap-8">
      <div>
       <DeviceRecommendationNotice tool="upscale" />
      </div>
      
      <BGRemoveWorkspace
        jobs={bgJobs}
        setJobs={setBgJobs}
        addToast={addToast}
        onFileAdd={handleBGFiles}
        onOpenPicker={openPicker}
        onEngineReport={(engine, webgpuAvailable) => {
          setBgEngine(engine);
          setBgWebgpuAvailable(webgpuAvailable);
        }}
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
