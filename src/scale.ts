import { useVideoConfig } from "remotion";

/**
 * Formattan bagimsiz olcu birimi. Yatay ve dikey videoda ayni gorsel
 * yogunlugu vermesi icin genislik yerine alanin karekokunu temel alir;
 * boylece 1920x1080 ile 1080x1920 ayni buyuklukte tipografi uretir.
 */
export const useScale = (): number => {
  const { width, height } = useVideoConfig();
  return Math.sqrt(width * height);
};
