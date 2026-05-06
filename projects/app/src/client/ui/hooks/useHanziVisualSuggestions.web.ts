import {
  searchNearestByDotProduct,
  parseFlatIndex,
} from "@/client/ui/hanziVisualSearch";
import type { FlatHanziVisualIndex } from "@/client/ui/hanziVisualSearch";
import { hanziCharactersFromHanziWord, loadDictionary } from "@/dictionary";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import type { InferenceSession, Tensor } from "onnxruntime-web";
import type {
  HanziVisualSuggestionsState,
  UseHanziVisualSuggestionsParams,
} from "./useHanziVisualSuggestions";
import { Asset } from "expo-asset";

const queryImageSize = 32;

interface RuntimeContext {
  index: FlatHanziVisualIndex;
  session: InferenceSession;
  makeTensor: (data: Float32Array, dims: readonly number[]) => Tensor;
}

let runtimePromise: Promise<RuntimeContext> | null = null;

function uriFromRequireSource(source: RnRequireSource): string {
  const uri =
    typeof source === `string` ? source : Asset.fromModule(source).uri;
  return uri;
}

async function loadBinaryIndex(
  binSrc: RnRequireSource,
  metaSrc: RnRequireSource,
  allowedCharacters: ReadonlySet<string>,
): Promise<FlatHanziVisualIndex> {
  const binUri = uriFromRequireSource(binSrc);
  const metaUri = uriFromRequireSource(metaSrc);

  const [binResponse, metaResponse] = await Promise.all([
    fetch(binUri),
    fetch(metaUri),
  ]);

  if (!binResponse.ok) {
    throw new Error(`Failed to load embedding vectors from ${binUri}`);
  }
  if (!metaResponse.ok) {
    throw new Error(`Failed to load embedding metadata from ${metaUri}`);
  }

  const [buffer, meta] = await Promise.all([
    binResponse.arrayBuffer(),
    metaResponse.json() as Promise<{ codepoints: string[] }>,
  ]);

  return parseFlatIndex(buffer, meta.codepoints, allowedCharacters);
}

async function loadDictionaryCharacterSet(): Promise<Set<string>> {
  const dictionary = await loadDictionary();
  const characters = new Set<string>();

  for (const hanziWord of dictionary.allHanziWords) {
    for (const character of hanziCharactersFromHanziWord(hanziWord)) {
      characters.add(character);
    }
  }

  return characters;
}

async function renderSelectedStrokesToTensor({
  strokePaths,
  pixelOffsetX,
  pixelOffsetY,
}: {
  strokePaths: readonly string[];
  pixelOffsetX: number;
  pixelOffsetY: number;
}): Promise<{ tensor: Float32Array; debugBitmapUrl: string }> {
  const canvas = document.createElement(`canvas`);
  canvas.width = queryImageSize;
  canvas.height = queryImageSize;

  const context = canvas.getContext(`2d`);
  if (context == null) {
    throw new Error(`2D canvas context is unavailable`);
  }

  const shiftedCanvas = document.createElement(`canvas`);
  shiftedCanvas.width = queryImageSize;
  shiftedCanvas.height = queryImageSize;

  const shiftedContext = shiftedCanvas.getContext(`2d`);
  if (shiftedContext == null) {
    throw new Error(`2D canvas context is unavailable`);
  }

  const serializedPaths = strokePaths
    .map((path) => `<path d="${path}" fill="black" />`)
    .join(``);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="white"/><g transform="scale(1,-1) translate(0,-900)">${serializedPaths}</g></svg>`;
  const blob = new Blob([svg], {
    type: `image/svg+xml`,
  });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => {
        resolve(nextImage);
      };
      nextImage.onerror = () => {
        reject(new Error(`Failed to load rendered SVG image`));
      };
      nextImage.src = objectUrl;
    });

    context.fillStyle = `white`;
    context.fillRect(0, 0, queryImageSize, queryImageSize);
    context.drawImage(image, 0, 0, queryImageSize, queryImageSize);

    shiftedContext.fillStyle = `white`;
    shiftedContext.fillRect(0, 0, queryImageSize, queryImageSize);
    shiftedContext.drawImage(canvas, pixelOffsetX, pixelOffsetY);

    const imageData = shiftedContext.getImageData(
      0,
      0,
      queryImageSize,
      queryImageSize,
    );
    const pixelCount = queryImageSize * queryImageSize;
    const result = new Float32Array(pixelCount);

    // Convert grayscale bitmap into single-channel normalized tensor [0,1].
    // Model expects white strokes (1.0) on black background (0.0).
    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
      const rgbaOffset = pixelIndex * 4;
      result[pixelIndex] = 1 - (imageData.data[rgbaOffset] ?? 255) / 255;
    }

    // Invert the preview so it visually matches the tensor polarity.
    shiftedContext.globalCompositeOperation = `difference`;
    shiftedContext.fillStyle = `white`;
    shiftedContext.fillRect(0, 0, queryImageSize, queryImageSize);
    shiftedContext.globalCompositeOperation = `source-over`;

    const previewUrl = shiftedCanvas.toDataURL(`image/png`);
    return { tensor: result, debugBitmapUrl: previewUrl };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadRuntimeContext(): Promise<RuntimeContext> {
  if (runtimePromise != null) {
    return runtimePromise;
  }

  runtimePromise = (async () => {
    const ort = require(
      `onnxruntime-web/wasm`,
    ) as typeof import("onnxruntime-web/wasm");
    ort.env.debug = true;
    ort.env.logLevel = `verbose`;
    ort.env.wasm.wasmPaths = {
      wasm: `/vendor/ort-wasm-simd-threaded.wasm`,
      mjs: `/vendor/ort-wasm-simd-threaded.mjs`,
    };

    const dictionaryCharacters = await loadDictionaryCharacterSet();

    const index = await loadBinaryIndex(
      require(`../../../ocr/vectors.bin`),
      require(`../../../ocr/vectorsMeta.json.bin`),
      dictionaryCharacters,
    );

    const session = await ort.InferenceSession.create(
      uriFromRequireSource(require(`../../../ocr/encoder.onnx`)),
      { executionProviders: [`wasm`] },
    );

    return {
      index,
      session,
      makeTensor(data: Float32Array, dims: readonly number[]) {
        return new ort.Tensor(`float32`, data, dims);
      },
    };
  })().catch((error: unknown) => {
    runtimePromise = null;
    throw error;
  });

  return runtimePromise;
}

function strokeSelectionKey({
  strokePaths,
  selectedStrokeIndexes,
}: {
  strokePaths: readonly string[];
  selectedStrokeIndexes: readonly number[];
}): string {
  return `${strokePaths.length}:${selectedStrokeIndexes.join(`,`)}`;
}

export function useHanziVisualSuggestions({
  strokePaths,
  selectedStrokeIndexes,
  pixelOffsetX = 0,
  pixelOffsetY = 0,
  limit = 6,
  debounceMs = 320,
}: UseHanziVisualSuggestionsParams): HanziVisualSuggestionsState {
  const [state, setState] = useState<HanziVisualSuggestionsState>({
    kind: `idle`,
  });

  const rawQueryKey =
    strokePaths == null || selectedStrokeIndexes.length === 0
      ? ``
      : `${strokeSelectionKey({
          strokePaths,
          selectedStrokeIndexes,
        })}@${pixelOffsetX},${pixelOffsetY}`;

  const debouncedQueryKey = useDebounce(rawQueryKey, debounceMs);

  useEffect(() => {
    if (typeof document === `undefined`) {
      setState({
        kind: `unsupported`,
        message: `Visual ONNX suggestions require a browser environment.`,
      });
      return;
    }

    const selectedPaths =
      strokePaths == null
        ? []
        : selectedStrokeIndexes
            .map((index) => strokePaths[index])
            .filter((path): path is string => path != null);

    if (debouncedQueryKey.length === 0 || selectedPaths.length === 0) {
      setState({ kind: `idle` });
      return;
    }

    const status = { isCancelled: false };
    setState({ kind: `loading` });

    void (async () => {
      try {
        const runtime = await loadRuntimeContext();
        const { tensor: imageTensor, debugBitmapUrl } =
          await renderSelectedStrokesToTensor({
            strokePaths: selectedPaths,
            pixelOffsetX,
            pixelOffsetY,
          });

        const output = await runtime.session.run({
          image: runtime.makeTensor(imageTensor, [
            1,
            1,
            queryImageSize,
            queryImageSize,
          ]),
        } as Record<string, Tensor>);

        const embeddingOutput = output[`embedding`];
        if (
          embeddingOutput == null ||
          !ArrayBuffer.isView(embeddingOutput.data)
        ) {
          throw new Error(
            `ONNX model output did not contain vector embedding data`,
          );
        }

        if (status.isCancelled) {
          return;
        }

        const queryEmbedding = embeddingOutput.data as Float32Array;
        const suggestions = searchNearestByDotProduct({
          queryEmbedding,
          index: runtime.index,
          limit,
        });

        setState({
          kind: `success`,
          suggestions,
          debugBitmapUrl,
        });
      } catch (error: unknown) {
        if (status.isCancelled) {
          return;
        }

        setState({
          kind: `error`,
          message:
            error instanceof Error
              ? error.message
              : `Unknown visual suggestion error`,
        });
      }
    })();

    return () => {
      status.isCancelled = true;
    };
  }, [
    debouncedQueryKey,
    limit,
    pixelOffsetX,
    pixelOffsetY,
    selectedStrokeIndexes,
    strokePaths,
  ]);

  return state;
}
