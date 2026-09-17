/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.overrideBundlerConfig(enableTailwind);

/**
 * Her paralel birim ayri bir headless Chrome demek. Varsayilan, mantiksal
 * cekirdegin yarisidir (bu makinede 8) ve render sirasinda sistemi kilitler.
 * 4, makineyi kullanilabilir birakirken render suresini kabul edilebilir tutar.
 */
Config.setConcurrency(4);

/**
 * Zemindeki blur, gradyan ve SVG filtreleri yazilim rasterizerinda CPU'yu
 * doyuruyor. "angle" bu isi ekran kartina devreder.
 */
Config.setChromiumOpenGlRenderer("angle");
