let kakaoLoadPromise: Promise<typeof window.kakao> | null = null;

function getKakaoLoadHint() {
  const hostname = window.location.hostname;
  if (hostname === "127.0.0.1") {
    return "Kakao Maps rejected the SDK request. This app is opened on 127.0.0.1, but the Kakao JavaScript key is usually registered per exact domain. Open http://localhost:3000 or add 127.0.0.1 to the Kakao allowed web domains.";
  }

  return "Failed to load Kakao Maps SDK. Check NEXT_PUBLIC_KAKAO_MAP_APP_KEY, Kakao JavaScript key type, allowed web domains, and network access to dapi.kakao.com.";
}

export function loadKakaoMapSdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Maps can only load in the browser."));
  }

  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }

  if (kakaoLoadPromise) {
    return kakaoLoadPromise;
  }

  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  if (!appKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_MAP_APP_KEY is not configured."),
    );
  }

  kakaoLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-kakao-map-sdk="true"]',
    );

    const finishLoad = () => {
      if (!window.kakao?.maps) {
        reject(new Error("Kakao Maps SDK loaded without window.kakao.maps."));
        return;
      }

      window.kakao.maps.load(() => resolve(window.kakao));
    };

    if (existingScript) {
      existingScript.addEventListener("load", finishLoad, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error(getKakaoLoadHint())),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.kakaoMapSdk = "true";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false`;
    script.onload = finishLoad;
    script.onerror = () => reject(new Error(getKakaoLoadHint()));
    document.head.appendChild(script);
  });

  return kakaoLoadPromise;
}
