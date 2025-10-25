// Kakao SDK types
interface KakaoShareContent {
  title: string;
  description: string;
  imageUrl: string;
  link: {
    webUrl: string;
    mobileWebUrl: string;
  };
}

interface KakaoShareButton {
  title: string;
  link: {
    webUrl: string;
    mobileWebUrl: string;
  };
}

interface Window {
  Kakao?: {
    isInitialized: () => boolean;
    init: (key: string) => void;
    Link: {
      sendDefault: (options: {
        objectType: string;
        content: KakaoShareContent;
        buttons: KakaoShareButton[];
      }) => void;
    };
  };
}
