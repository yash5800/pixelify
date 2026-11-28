import type { Metadata } from 'next';
import { languageAlternates, localizedHref } from '@/lib/seo';

export type SeoPage = 'home' | 'upscaler' | 'bg_remove';

export interface PageSeo {
  title: string;
  description: string;
  keywords: string[];
}

/** Canonical path for each page, shared by every language. */
export const PAGE_PATHS: Record<SeoPage, string> = {
  home: '/',
  upscaler: '/upscaler/',
  bg_remove: '/bg_remove/',
};

/**
 * Open Graph locale codes for the languages Pixelify ships.
 * These follow the language → primary market mapping used for keyword research.
 */
const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  pt: 'pt_BR',
  zh: 'zh_CN',
  ja: 'ja_JP',
  ko: 'ko_KR',
  hi: 'hi_IN',
  ru: 'ru_RU',
};

/**
 * Page- and language-specific SEO copy.
 *
 * Keywords are researched per market rather than translated: each list uses the
 * phrasing people actually type in that language (e.g. "quitar fondo" in
 * Spanish, "背景 透過" in Japanese, "누끼" in Korean, "抠图" in Chinese,
 * Devanagari + Hinglish for Hindi). One page owns one intent so the three
 * pages do not compete for the same query.
 */
export const PAGE_SEO: Record<SeoPage, Record<string, PageSeo>> = {
  home: {
    en: {
      title: 'Free AI Photo Editor, Upscaler & BG Remover | Pixelify',
      description:
        'Edit photos in your browser with AI: upscale images up to 8×, remove backgrounds instantly, and keep every file on-device. Free, private, no sign-up.',
      keywords: [
        'ai photo editor',
        'free ai photo editor',
        'online photo editor',
        'photo editor online free',
        'ai image editor',
        'on-device photo editor',
        'private photo editor',
        'webgpu photo editor',
        'edit photos in browser',
        'image enhancer',
        'free photo editing tools',
        'no upload photo editor',
        'background remover',
        'image upscaler',
        'ai photo editing',
      ],
    },
    es: {
      title: 'Editor de fotos IA gratis: escalar y quitar fondo | Pixelify',
      description:
        'Edita tus fotos en el navegador con IA: escala imágenes hasta 8×, quita el fondo al instante y mantén los archivos en tu dispositivo. Gratis y privado.',
      keywords: [
        'editor de fotos ia',
        'editor de fotos ia gratis',
        'editor de imágenes online',
        'editar fotos online gratis',
        'editor de imágenes con ia',
        'editor de fotos sin registro',
        'editar fotos en el navegador',
        'herramienta de fotos ia',
        'quitar fondo',
        'quitar fondo de imagen',
        'escalar imagen con ia',
        'mejorar calidad de imagen',
        'aumentar resolución de imagen',
        'imagen en alta definición',
        'fondo transparente',
      ],
    },
    fr: {
      title: 'Éditeur photo IA gratuit : agrandir et détourer | Pixelify',
      description:
        'Retouchez vos photos dans le navigateur grâce à l’IA : agrandissez jusqu’à 8×, supprimez le fond instantanément et gardez vos fichiers sur votre appareil. Gratuit.',
      keywords: [
        'éditeur photo ia',
        'éditeur photo ia gratuit',
        'éditeur d’image en ligne',
        'retouche photo en ligne',
        'modifier photo ia',
        'éditeur image ia',
        'éditeur photo sans inscription',
        'retoucher photo navigateur',
        'outil photo ia',
        'supprimer fond image',
        'détourer image',
        'enlever fond photo',
        'augmenter résolution image',
        'améliorer qualité image',
        'agrandir image sans perte',
        'photo haute définition',
      ],
    },
    pt: {
      title: 'Editor de fotos com IA grátis, upscaler e removedor | Pixelify',
      description:
        'Edite fotos no navegador com IA: aumente a resolução até 8×, remova o fundo na hora e mantenha seus arquivos no dispositivo. Grátis, privado e sem cadastro.',
      keywords: [
        'editor de fotos ia',
        'editor de fotos ia grátis',
        'editor de imagem online',
        'editar foto online grátis',
        'editor de imagens com ia',
        'editor de fotos sem login',
        'editar fotos no navegador',
        'ferramenta de fotos ia',
        'remover fundo',
        'remover fundo de imagem',
        'aumentar resolução de imagem',
        'melhorar qualidade de imagem',
        'imagem em alta definição',
        'fundo transparente',
        'foto hd',
      ],
    },
    zh: {
      title: 'AI 修图工具：在线抠图与图片高清放大 | Pixelify',
      description:
        '在浏览器中用 AI 编辑图片：最高 8 倍放大、一键抠图去背景，所有处理都在本地完成，不上传、不联网、免费使用。',
      keywords: [
        'ai修图',
        'ai修图工具',
        'ai修图在线',
        'ai修图免费',
        '在线图片编辑',
        '图片编辑器',
        '在线修图',
        '免费修图工具',
        '照片编辑',
        '浏览器修图',
        '本地ai修图',
        '抠图',
        '去背景',
        '图片放大',
        '图片高清修复',
        '提高图片分辨率',
      ],
    },
    ja: {
      title: 'AI写真編集・画像高画質化・背景透過ツール | Pixelify',
      description:
        'ブラウザだけでAI写真編集。画像を最大8倍に高画質化、ワンクリックで背景透過。ファイルは端末内で処理され、アップロード不要・無料で使えます。',
      keywords: [
        '写真 編集 ai',
        'ai 写真 編集',
        '画像 編集 無料',
        '写真 加工 ai',
        'ai 画像 編集',
        'オンライン 画像 編集',
        'ブラウザ 画像 編集',
        '無料 写真 編集',
        '画像 編集 サイト',
        '背景 透過',
        '画像 高画質化',
        '画像 拡大',
        '背景 削除',
        '画像 加工',
        '写真 編集 アプリ',
      ],
    },
    ko: {
      title: 'AI 사진 편집·이미지 화질 개선·배경 제거 | Pixelify',
      description:
        '브라우저에서 AI로 사진을 편집하세요. 최대 8배 화질 개선, 클릭 한 번으로 배경 제거. 모든 처리는 기기 안에서 이뤄지며 업로드 없이 무료로 사용할 수 있습니다.',
      keywords: [
        'ai 사진 편집',
        'ai 사진 편집 사이트',
        '사진 편집 사이트',
        '이미지 편집',
        '온라인 사진 편집',
        '무료 사진 편집',
        '사진 편집 ai',
        '브라우저 사진 편집',
        '이미지 편집 사이트',
        '배경 제거',
        '누끼',
        '이미지 화질 개선',
        '사진 확대',
        '배경 투명',
        'ai 이미지 편집',
      ],
    },
    hi: {
      title: 'AI फोटो एडिटर, इमेज अपस्केलर और बैकग्राउंड रिमूवर | Pixelify',
      description:
        'ब्राउज़र में AI से फोटो एडिट करें: इमेज को 8× तक अपस्केल करें और एक क्लिक में बैकग्राउंड हटाएं। फाइलें आपके डिवाइस पर रहती हैं, अपलोड नहीं होतीं। मुफ्त और निजी।',
      keywords: [
        'ai फोटो एडिटर',
        'फोटो एडिट',
        'फोटो एडिटिंग',
        'ऑनलाइन फोटो एडिटर',
        'मुफ्त फोटो एडिटर',
        'फोटो एडिटर ऑनलाइन',
        'फोटो एडिटिंग करने वाला ऐप्स',
        'इमेज एडिटर',
        'ब्राउज़र में फोटो एडिट',
        'बैकग्राउंड हटाएं',
        'बैकग्राउंड रिमूवर',
        'फोटो बैकग्राउंड हटाएं',
        'इमेज क्वालिटी बढ़ाएं',
        'फोटो क्वालिटी बढ़ाएं',
        'फोटो बड़ा करें',
        'photo edit',
      ],
    },
    ru: {
      title: 'ИИ-фоторедактор: улучшение фото и удаление фона | Pixelify',
      description:
        'Редактируйте фото в браузере с помощью ИИ: увеличивайте до 8×, удаляйте фон в один клик. Файлы остаются на устройстве — без загрузки, бесплатно и приватно.',
      keywords: [
        'ии фоторедактор',
        'ии фоторедактор онлайн',
        'фоторедактор онлайн',
        'редактор фото онлайн',
        'нейросеть для фото',
        'редактор фото бесплатно',
        'фоторедактор без регистрации',
        'редактировать фото в браузере',
        'обработка фото ии',
        'удалить фон',
        'убрать фон с фото',
        'улучшить качество фото',
        'увеличить разрешение фото',
        'апскейл фото',
        'фото в высоком качестве',
      ],
    },
  },

  upscaler: {
    en: {
      title: 'AI Image Upscaler: Upscale Photos 4×/8× Free | Pixelify',
      description:
        'Upscale images up to 8× in your browser with AI super-resolution. Sharpen low-res photos, restore detail, and export 4K/8K results — free, private, no uploads.',
      keywords: [
        'ai image upscaler',
        'image upscaler',
        'upscale image online',
        'upscale image free',
        'ai upscaler 4k',
        'photo enhancer',
        'enhance image quality',
        'increase image resolution',
        'super resolution',
        '8x upscaler',
        'upscale image without losing quality',
        'ai photo enhancer',
        'hd image upscaler',
        'upscale to 4k',
        'restore old photos',
      ],
    },
    es: {
      title: 'Escalar imágenes con IA: mejora la calidad hasta 8× | Pixelify',
      description:
        'Aumenta la resolución de tus fotos hasta 8× con IA. Mejora la calidad, recupera detalles y exporta en 4K sin subir tus imágenes a la nube. Gratis y privado.',
      keywords: [
        'escalar imagen',
        'escalar imagen con ia',
        'escalar imagen online',
        'escalar imagen gratis',
        'escalar imagen sin perder calidad',
        'aumentar resolución de imagen',
        'aumentar resolución imagen 4k',
        'mejorar calidad de imagen',
        'mejorar calidad de imagen ia',
        'agrandar imagen sin perder calidad',
        'superresolución',
        'mejorar fotos borrosas',
        'potenciar imagen ia',
        'imagen en alta definición',
        'upscaler de imágenes',
      ],
    },
    fr: {
      title: 'Agrandir une image avec l’IA : qualité jusqu’à 8× | Pixelify',
      description:
        'Augmentez la résolution de vos images jusqu’à 8× grâce à l’IA. Améliorez la netteté, restaurez les détails et exportez en 4K, sans envoi sur le cloud.',
      keywords: [
        'augmenter résolution image',
        'augmenter résolution image ia',
        'améliorer qualité image',
        'améliorer qualité image ia',
        'agrandir image sans perdre qualité',
        'agrandir image sans perte qualité',
        'upscaler image',
        'agrandir photo ia',
        'augmenter résolution image 4k',
        'super résolution',
        'rendre image plus nette',
        'améliorer photo floue',
        'image haute définition',
        'agrandir image en ligne gratuit',
        'upscaler photo',
      ],
    },
    pt: {
      title: 'Aumentar resolução de imagem com IA até 8× | Pixelify',
      description:
        'Aumente a resolução das suas fotos até 8× com IA. Melhore a qualidade, recupere detalhes e exporte em 4K sem enviar imagens para a nuvem. Grátis e privado.',
      keywords: [
        'aumentar resolução imagem',
        'aumentar resolução imagem ia',
        'melhorar qualidade imagem',
        'melhorar qualidade imagem ia',
        'ampliar imagem sem perder qualidade',
        'aumentar resolução imagem 4k',
        'upscale imagem',
        'deixar imagem em hd',
        'melhorar foto borrada',
        'super resolução',
        'aumentar qualidade de foto',
        'imagem alta definição',
        'aumentar resolução online grátis',
        'upscaler de imagem',
        'restaurar foto antiga',
      ],
    },
    zh: {
      title: '图片高清修复与放大：AI 无损放大至 8 倍 | Pixelify',
      description:
        '用 AI 将图片放大至 8 倍并修复画质，提升清晰度、还原细节，支持 4K 导出，全程在浏览器本地处理，图片不上传，免费使用。',
      keywords: [
        '图片放大',
        '图片高清修复',
        '图片高清',
        '图片变清晰',
        '图片放大不模糊',
        '提高图片分辨率',
        'ai图片放大',
        'ai画质修复',
        '图片无损放大',
        '图片高清化',
        '老照片修复',
        '图片增强',
        '4k图片放大',
        '在线图片放大',
        '图片分辨率提高',
      ],
    },
    ja: {
      title: '画像 高画質化・AI 拡大で最大8倍に | Pixelify',
      description:
        'AIで画像を最大8倍に拡大し、ぼやけやノイズを補正。解像度を上げて4K出力にも対応。ブラウザ内で処理するため画像はアップロードされません。',
      keywords: [
        '画像 高画質化',
        '画像 高画質化 無料',
        '画像 高画質化 ai',
        '画像 拡大',
        '画像 拡大 ai',
        '画像 拡大 ぼやけない',
        '画像 を 綺麗 に',
        '解像度 上げる',
        '画像 解像度 上げる',
        'ai アップスケール',
        '写真 高画質化',
        '低画質 画像 修正',
        '画像 鮮明 に',
        '4k 画像 拡大',
        '画像 補正 ai',
      ],
    },
    ko: {
      title: '이미지 화질 개선·AI 사진 확대 최대 8배 | Pixelify',
      description:
        'AI로 이미지를 최대 8배 확대하고 흐림과 노이즈를 개선하세요. 해상도를 높여 4K 출력도 지원하며, 브라우저에서 처리해 사진이 업로드되지 않습니다.',
      keywords: [
        '이미지 화질 개선',
        '이미지 화질 개선 사이트',
        '이미지 화질 개선 ai',
        '사진 확대',
        '사진 확대 사이트',
        '사진 확대해도 안깨지게',
        '해상도 높이기',
        '해상도 높이기 사이트',
        'ai 업스케일',
        '저화질 사진 복원',
        '사진 고화질',
        '이미지 선명하게',
        '사진 화질 높이기',
        '4k 사진 확대',
        '이미지 업스케일',
      ],
    },
    hi: {
      title: 'AI इमेज अपस्केलर: फोटो क्वालिटी 8× तक बढ़ाएं | Pixelify',
      description:
        'AI से इमेज को 8× तक बड़ा करें और धुंधलापन सुधारें। रिज़ॉल्यूशन बढ़ाकर 4K में एक्सपोर्ट करें। सारी प्रोसेसिंग ब्राउज़र में होती है, फोटो अपलोड नहीं होती।',
      keywords: [
        'फोटो क्वालिटी बढ़ाएं',
        'इमेज क्वालिटी बढ़ाएं',
        'फोटो बड़ा करें',
        'इमेज रिज़ॉल्यूशन बढ़ाएं',
        'फोटो रिज़ॉल्यूशन बढ़ाएं',
        'फोटो हाई क्वालिटी',
        'धुंधली फोटो साफ करें',
        'ai इमेज अपस्केलर',
        'इमेज अपस्केल',
        'फोटो एन्हांस',
        'photo quality badhaye',
        'image quality badhaye',
        'photo bada kare',
        'hd photo banaye',
        '4k photo upscale',
      ],
    },
    ru: {
      title: 'Увеличить разрешение фото с ИИ до 8× | Pixelify',
      description:
        'Увеличьте разрешение фото до 8× с помощью ИИ. Улучшите четкость, восстановите детали и экспортируйте в 4K — прямо в браузере, без загрузки на сервер.',
      keywords: [
        'увеличить разрешение фото',
        'улучшить качество фото',
        'улучшить качество фото онлайн',
        'увеличить разрешение фото нейросеть',
        'нейросеть увеличить фото',
        'апскейл фото',
        'улучшить качество фото до 4к',
        'увеличить фото без потери качества',
        'повысить разрешение изображения',
        'улучшить четкость фото',
        'восстановить старое фото',
        'фото в высоком разрешении',
        'upscale фото',
        'улучшение качества изображения',
        'увеличить фото онлайн',
      ],
    },
  },

  bg_remove: {
    en: {
      title: 'Background Remover: Remove Image Backgrounds Free | Pixelify',
      description:
        'Remove image backgrounds instantly with AI. Get clean transparent PNG cutouts for portraits, products, and logos — right in your browser, free and private.',
      keywords: [
        'background remover',
        'remove background',
        'remove background from image',
        'background remover free',
        'transparent background maker',
        'remove image background online',
        'background eraser',
        'cut out image',
        'png background remover',
        'ai background remover',
        'make background transparent',
        'remove bg',
        'product photo background remover',
        'portrait background remover',
        'transparent png',
      ],
    },
    es: {
      title: 'Quitar fondo de imagen online gratis con IA | Pixelify',
      description:
        'Quita el fondo de cualquier imagen al instante con IA. Consigue recortes limpios y PNG transparentes para retratos, productos y logos, sin subir archivos.',
      keywords: [
        'quitar fondo',
        'quitar fondo de imagen',
        'quitar fondo online gratis',
        'quitar fondo imagen ia',
        'eliminar fondo',
        'eliminar fondo de imagen',
        'eliminar fondo online',
        'quitar fondo de foto',
        'quitar fondo sin registro',
        'quitar fondo para productos',
        'borrar fondo de imagen',
        'recortar imagen',
        'fondo transparente',
        'hacer fondo transparente',
        'png transparente',
      ],
    },
    fr: {
      title: 'Supprimer le fond d’une image en ligne gratuit | Pixelify',
      description:
        'Supprimez le fond de n’importe quelle image en quelques secondes grâce à l’IA. Obtenez des PNG transparents nets pour portraits, produits et logos, sans upload.',
      keywords: [
        'supprimer fond image',
        'supprimer fond image gratuit',
        'supprimer fond image en ligne',
        'enlever fond photo',
        'enlever fond image',
        'détourer image',
        'détourer image gratuitement',
        'supprimer arrière-plan',
        'supprimer fond sans inscription',
        'détourage photo',
        'supprimer fond produit',
        'retirer fond image',
        'fond transparent',
        'png transparent',
        'rendre fond transparent',
      ],
    },
    pt: {
      title: 'Remover fundo de imagem online grátis com IA | Pixelify',
      description:
        'Remova o fundo de qualquer imagem em segundos com IA. Crie PNGs transparentes e recortes limpos para retratos, produtos e logos, sem enviar arquivos.',
      keywords: [
        'remover fundo',
        'remover fundo de imagem',
        'remover fundo online grátis',
        'remover fundo imagem ia',
        'tirar fundo de imagem',
        'tirar fundo online',
        'remover fundo sem cadastro',
        'remover fundo de foto',
        'remover fundo produto',
        'apagar fundo de imagem',
        'recortar imagem',
        'fundo transparente',
        'deixar fundo transparente',
        'png transparente',
        'fundo branco transparente',
      ],
    },
    zh: {
      title: '在线抠图去背景：AI 一键透明背景 | Pixelify',
      description:
        '用 AI 一键去除图片背景，生成干净的透明 PNG，适合人像、商品和 logo。全程浏览器本地处理，无需上传，免费且保护隐私。',
      keywords: [
        '抠图',
        '在线抠图',
        '抠图免费',
        'ai抠图',
        '去背景',
        '去背景在线',
        '图片去背景',
        '一键抠图',
        '人像抠图',
        '商品抠图',
        '抠图工具',
        '图片背景移除',
        '背景透明',
        '透明背景',
        'png透明背景',
      ],
    },
    ja: {
      title: '背景透過・背景削除をAIで無料 | Pixelify',
      description:
        'AIで画像の背景をワンクリック削除。人物・商品・ロゴをきれいに切り抜き、透過PNGで保存できます。ブラウザ内処理でアップロード不要、無料です。',
      keywords: [
        '背景 透過',
        '背景 透過 無料',
        '背景 透過 ai',
        '背景 削除',
        '背景 削除 無料',
        '背景 削除 ai',
        '画像 背景 透過',
        '切り抜き',
        '画像 切り抜き',
        '透過 png',
        '背景 透明',
        '人物 切り抜き',
        '商品 画像 背景 削除',
        '背景 透過 サイト',
        '画像 背景 削除',
      ],
    },
    ko: {
      title: 'AI 배경 제거·누끼 따기 무료 | Pixelify',
      description:
        'AI로 이미지 배경을 한 번에 제거하세요. 인물, 상품, 로고를 깔끔하게 누끼 따서 투명 PNG로 저장할 수 있습니다. 업로드 없이 브라우저에서 무료로 처리됩니다.',
      keywords: [
        '배경 제거',
        '배경 제거 사이트',
        '배경 제거 무료',
        '배경 제거 ai',
        '누끼',
        '누끼 따기',
        '누끼 사이트',
        '누끼 따는 사이트',
        '배경 투명화',
        '배경 투명화 사이트',
        '이미지 배경 제거',
        '사진 배경 지우기',
        '상품 누끼',
        '인물 누끼',
        '투명 png',
      ],
    },
    hi: {
      title: 'AI बैकग्राउंड रिमूवर: फोटो का बैकग्राउंड हटाएं | Pixelify',
      description:
        'AI से किसी भी फोटो का बैकग्राउंड सेकंडों में हटाएं और साफ ट्रांसपेरेंट PNG पाएं। पोर्ट्रेट, प्रोडक्ट और लोगो के लिए ब्राउज़र में मुफ्त, बिना अपलोड।',
      keywords: [
        'बैकग्राउंड हटाएं',
        'बैकग्राउंड रिमूवर',
        'फोटो बैकग्राउंड हटाएं',
        'बैकग्राउंड रिमूवर फ्री',
        'बैकग्राउंड रिमूवर ऑनलाइन',
        'फोटो का बैकग्राउंड कैसे हटाएं',
        'बैकग्राउंड रिमूवर इमेज',
        'ट्रांसपेरेंट बैकग्राउंड',
        'पारदर्शी बैकग्राउंड',
        'png बैकग्राउंड',
        'photo background remove',
        'background hataye',
        'transparent background banaye',
        'photo ka background hataye',
        'image background remover',
      ],
    },
    ru: {
      title: 'Удалить фон с фото онлайн бесплатно | Pixelify',
      description:
        'Удалите фон с любого изображения за секунды с помощью ИИ. Получите чистые прозрачные PNG для портретов, товаров и логотипов — без загрузки файлов.',
      keywords: [
        'удалить фон',
        'удалить фон с фото',
        'убрать фон с фото',
        'удаление фона',
        'удалить фон онлайн',
        'удалить фон бесплатно',
        'удалить фон без регистрации',
        'удалить фон с картинки',
        'вырезать объект',
        'обрезать фон',
        'обработка фото фон',
        'фон для товара',
        'прозрачный фон',
        'сделать прозрачный фон',
        'png прозрачный фон',
      ],
    },
  },
};

/** Page SEO for a language, falling back to English. */
export function getPageSeo(page: SeoPage, lang: string): PageSeo {
  return PAGE_SEO[page][lang] ?? PAGE_SEO[page].en;
}

/**
 * Complete Next.js metadata for a page in a language: localized title,
 * description and keywords, canonical + hreflang alternates, and matching
 * Open Graph / Twitter cards.
 */
export function pageMetadata(page: SeoPage, lang: string): Metadata {
  const seo = getPageSeo(page, lang);
  const path = PAGE_PATHS[page];
  const url = localizedHref(lang, path);

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: url,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: 'website',
      siteName: 'Pixelify',
      title: seo.title,
      description: seo.description,
      url,
      locale: OG_LOCALES[lang] ?? 'en_US',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Pixelify AI photo editor',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: ['/og-image.jpg'],
    },
  };
}
