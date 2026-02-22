import { MUPDF_LOADED, RedactionTarget, type MupdfWorker } from "@/workers/mupdf.worker";
import * as Comlink from "comlink";
import { Remote } from "comlink";
import { useCallback, useEffect, useRef, useState } from "react";

export function useMupdf() {
  const [isWorkerInitialized, setIsWorkerInitialized] = useState(false);
  const document = useRef<ArrayBuffer | null>(null);
  const mupdfWorker = useRef<Remote<MupdfWorker>>();

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/mupdf.worker", import.meta.url),
      {
        type: "module",
      }
    );
    mupdfWorker.current = Comlink.wrap<MupdfWorker>(worker);

    worker.addEventListener("message", (event) => {
      if (event.data === MUPDF_LOADED) {
        setIsWorkerInitialized(true);
      }
    });

    return () => {
      worker.terminate();
    };
  }, []);

  const loadDocument = useCallback((arrayBuffer: ArrayBuffer) => {
    document.current = arrayBuffer;
    return mupdfWorker.current!.loadDocument(arrayBuffer);
  }, []);

  const redactPages = useCallback((redactionTargets: RedactionTarget[]) => {
    if (!document.current) {
      throw new Error("Document not loaded");
    }

    return mupdfWorker.current!.applyRedactions(redactionTargets);
  }, []);

  return {
    isWorkerInitialized,
    loadDocument,
    redactPages,
  };
}
