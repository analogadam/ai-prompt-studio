/**
 * Lokal ComfyUI sunucusuna is gonderip sonucu dosya olarak alan ince istemci.
 *
 * Sunucu: http://127.0.0.1:8188  (C:\Users\husey\video-karakter\ComfyUI-baslat.bat)
 *
 * ComfyUI'nin "API formati" bir dugum haritasidir: her anahtar bir dugum
 * kimligi, degeri ise {class_type, inputs}. Baglantilar [dugum_kimligi, cikis]
 * dizisiyle verilir. Buradaki yardimcilar sablonu okuyup ilgili alanlari
 * degistirir; is akisinin kendisi comfy/ altinda JSON olarak durur.
 */
import fs from "node:fs";
import path from "node:path";

const SERVER = process.env.COMFY_URL || "http://127.0.0.1:8188";
const COMFY_INPUT = "C:/Users/husey/ComfyUI/input";
const POLL_MS = 2000;
// Model 12 GB'lik karta sigmadigi icin agirliklar sistem belleginden akiyor;
// bu da bir isin sessizce kilitlenebilecegi anlamina geliyor. Beklenenin cok
// ustune cikan is saatlerce asili kalmasin diye kesiliyor.
const TIMEOUT_MS = Number(process.env.COMFY_TIMEOUT_MS ?? 20 * 60 * 1000);

const fail = (message) => {
  console.error("\nHATA: " + message + "\n");
  process.exit(1);
};

/** Sunucu ayakta mi? Degilse ne yapilacagini soyleyip cikar. */
export const ensureServer = async () => {
  try {
    const response = await fetch(SERVER + "/system_stats", {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(String(response.status));
  } catch {
    fail(
      "ComfyUI sunucusuna ulasilamadi (" +
        SERVER +
        ").\n" +
        "Ayri bir pencerede su dosyayi calistirin ve acik birakin:\n" +
        "  C:\\Users\\husey\\video-karakter\\ComfyUI-baslat.bat",
    );
  }
};

/** Sablonu okur; her cagri kendi kopyasini degistirsin diye derin kopya doner. */
export const loadWorkflow = (name) => {
  const file = path.join("comfy", name);
  if (!fs.existsSync(file)) fail("Is akisi bulunamadi: " + file);
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

/**
 * Dugumun bir girdisini degistirir.
 * Dugumler JSON icinde _meta.title ile etiketlenmistir; kimlik numaralari
 * degisse de betikler bozulmasin diye arama basliga gore yapilir.
 */
export const setInput = (workflow, nodeName, input, value) => {
  const entry = Object.values(workflow).find((node) => node._meta?.title === nodeName);
  if (!entry) fail('Is akisinda "' + nodeName + '" adli dugum yok.');
  if (!(input in entry.inputs)) {
    fail('"' + nodeName + '" dugumunde "' + input + '" girdisi yok.');
  }
  entry.inputs[input] = value;
};

/** Verilen ad ComfyUI'nin input klasorunde var mi? */
export const hasInput = (name) => fs.existsSync(path.join(COMFY_INPUT, name));

/** Dosyayi ComfyUI'nin input klasorune kopyalar ve oradaki adini doner. */
export const stageInput = (source) => {
  if (!fs.existsSync(source)) fail("Girdi dosyasi yok: " + source);
  const name = path.basename(source);
  fs.copyFileSync(source, path.join(COMFY_INPUT, name));
  return name;
};

const queue = async (workflow) => {
  const response = await fetch(SERVER + "/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });

  const body = await response.json();
  if (!response.ok || body.error) {
    const detail = body.error?.message ?? JSON.stringify(body).slice(0, 400);
    const node = Object.values(body.node_errors ?? {})[0];
    const extra = node ? "\n  " + JSON.stringify(node.errors) : "";
    fail("ComfyUI isi reddetti: " + detail + extra);
  }
  return body.prompt_id;
};

/** Is bitene kadar bekler; gecen sureyi ayni satirda gosterir. */
const waitFor = async (promptId, label) => {
  const startedAt = Date.now();

  for (;;) {
    const history = await (await fetch(SERVER + "/history/" + promptId)).json();
    const entry = history[promptId];

    if (entry) {
      const status = entry.status ?? {};
      if (status.status_str === "error") {
        const message = (status.messages ?? [])
          .filter(([kind]) => kind === "execution_error")
          .map(([, data]) => data.exception_message)
          .join(" | ");
        process.stdout.write("\n");
        fail("Render hata verdi: " + (message || "ayrinti yok"));
      }
      process.stdout.write("\n");
      return { outputs: entry.outputs, seconds: (Date.now() - startedAt) / 1000 };
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed > TIMEOUT_MS) {
      await fetch(SERVER + "/interrupt", { method: "POST" }).catch(() => {});
      process.stdout.write("\n");
      fail(
        "Is " +
          Math.round(elapsed / 60000) +
          " dakikadir ilerlemiyor, kesildi.\n" +
          "ComfyUI penceresini kapatip yeniden acin; biten parcalar korunuyor, " +
          "ayni komut kaldigi yerden devam eder.",
      );
    }

    process.stdout.write("\r  " + label + " ... " + Math.round(elapsed / 1000) + " sn");
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
};

/**
 * Sunucunun yukledigi modelleri ve onbellegini birakmasini ister.
 * Ayni oturumda arka arkaya agir is calistirildiginda bellek birikiyor ve
 * ucuncu is civarinda ornekleme kilitleniyor; her isten once temizlemek bunu
 * onluyor.
 */
export const freeMemory = async () => {
  await fetch(SERVER + "/free", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unload_models: true, free_memory: true }),
  }).catch(() => {});
};

/** Cikti tanimlarini (images/gifs/video) tek bir listede toplar. */
const collectFiles = (outputs) =>
  Object.values(outputs).flatMap((output) =>
    [...(output.images ?? []), ...(output.gifs ?? []), ...(output.video ?? [])].filter(
      (file) => file.type !== "temp",
    ),
  );

const download = async (file, target) => {
  const query = new URLSearchParams({
    filename: file.filename,
    subfolder: file.subfolder ?? "",
    type: file.type ?? "output",
  });
  const response = await fetch(SERVER + "/view?" + query);
  if (!response.ok) fail("Cikti indirilemedi: " + file.filename);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
};

/**
 * Is akisini calistirir ve ilk ciktiyi verilen yola yazar.
 *
 * @param {object} workflow  API formatinda is akisi
 * @param {string} target    Sonucun yazilacagi yol
 * @param {string} label     Bekleme satirinda gosterilecek ad
 * @returns {Promise<{seconds: number, outputs: object}>}
 */
export const runWorkflow = async (workflow, target, label) => {
  await ensureServer();
  const promptId = await queue(workflow);
  const { outputs, seconds } = await waitFor(promptId, label);

  const files = collectFiles(outputs);
  if (files.length === 0) fail("Is bitti ama cikti dosyasi yok.");
  await download(files[0], target);

  return { seconds, outputs };
};

/** Baslikla verilen dugumun urettigi dosyalari listeler (tur farketmeksizin). */
const nodeFiles = (workflow, outputs, nodeTitle) => {
  const id = Object.keys(workflow).find((key) => workflow[key]._meta?.title === nodeTitle);
  if (!id) fail('Is akisinda "' + nodeTitle + '" adli dugum yok.');

  const entry = outputs[id];
  if (!entry) fail('"' + nodeTitle + '" dugumu cikti uretmedi.');

  return Object.values(entry)
    .flat()
    .filter((file) => file?.filename);
};

/**
 * Bir dugumun ciktisini ComfyUI'nin girdi klasorune indirir; sonraki isler
 * LoadLatent/LoadImage ile bu adi kullanabilir. Uretilen adi doner.
 */
export const stageOutput = async (workflow, outputs, nodeTitle, name) => {
  const [file] = nodeFiles(workflow, outputs, nodeTitle);
  if (!file) fail('"' + nodeTitle + '" dugumunden dosya alinamadi.');

  await download(file, path.join(COMFY_INPUT, name));
  return name;
};
