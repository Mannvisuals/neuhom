"use client";

import { useEffect, useState } from "react";
import { repository } from "./repository";

/** Object URL for a stored asset; revoked on unmount. */
export function useAssetUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    let revoked = false;
    let objectUrl: string | null = null;
    repository.getAsset(id).then((blob) => {
      if (revoked || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url;
}
