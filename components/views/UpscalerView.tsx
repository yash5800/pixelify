'use client';

import DeviceRecommendationNotice from '../DeviceRecommendationNotice';
import UploadArea from '../UploadArea';
import UpscaleWorkspace from '../UpscaleWorkspace';
import UpscaleShowcase from '../upscaler/UpscaleShowcase';
import UpscaleShowreel from '../upscaler/UpscaleShowreel';
import UpscaleCapabilities from '../upscaler/UpscaleCapabilities';
import UpscaleJourney from '../upscaler/UpscaleJourney';
import UpscaleFaq from '../upscaler/UpscaleFaq';
import Footer from '../Footer';
import { useApp } from '../AppProvider';

export default function UpscalerView() {
  const {
    navigateTo,
    step,
    items,
    selectedId,
    setSelectedId,
    addUpscaleFile,
    modelLoading,
    modelProgress,
    onItemModelChange,
    onItemOptionsChange,
    onResetItemSettings,
    onUpscaleItem,
    onCancelUpscale,
    onDownloadItem,
    onRemoveItem,
    onClearAll,
    onExitWorkspace,
    onOpenMobileSidebar,
  } = useApp();

  return (
    <div className="flex flex-col gap-8 w-full px-2">
      <DeviceRecommendationNotice tool="upscale" />

      {step === 'upload' && (
        <UploadArea
          onFile={addUpscaleFile}
          isLoading={items.some((i) => i.status === 'processing')}
          fileName={items[0]?.name}
          fileSize={items[0]?.size}
          onClear={onClearAll}
          beforeImage="/upscaler/shoes.jpeg"
          afterImage="/upscaler/shoes.png"
          maxSizeMB={15}
        />
      )}

      {step === 'upload' && (
        <>
          <UpscaleShowcase />
          <UpscaleShowreel />
          <UpscaleCapabilities />
          <UpscaleJourney />
          <UpscaleFaq />
        </>
      )}

      {step !== 'upload' && (
        <UpscaleWorkspace
          items={items}
          selectedId={selectedId || (items[0]?.id ?? '')}
          onSelectId={setSelectedId}
          onRemoveId={onRemoveItem}
          onAddFile={addUpscaleFile}
          isLoading={modelLoading}
          modelProgress={modelProgress}
          onModelChange={onItemModelChange}
          onOptionsChange={onItemOptionsChange}
          onResetSettings={onResetItemSettings}
          onUpscale={onUpscaleItem}
          onCancel={onCancelUpscale}
          onDownload={onDownloadItem}
          onReset={onClearAll}
          onOpenMobileSidebar={onOpenMobileSidebar}
          onExitWorkspace={onExitWorkspace}
        />
      )}

      <Footer onTabChange={navigateTo} />
    </div>
  );
}
