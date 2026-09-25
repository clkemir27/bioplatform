"use client";

import { useEffect, useRef } from "react";
import { PluginContext } from "molstar/lib/mol-plugin/context";
import { DefaultPluginSpec } from "molstar/lib/mol-plugin/spec";

type MolstarViewerProps = {
  pdbId: string;
};

export default function MolstarViewer({
  pdbId,
}: MolstarViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const parent = containerRef.current;

    let cancelled = false;
    let plugin: PluginContext | undefined;

    async function init() {
      const canvas = document.createElement("canvas");

      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";

      parent.appendChild(canvas);

      const instance = new PluginContext(
        DefaultPluginSpec()
      );

      plugin = instance;

      await instance.init();

      if (cancelled) {
        instance.dispose();
        return;
      }

      const viewerReady =
        await instance.initViewerAsync(
          canvas,
          parent
        );

      if (!viewerReady) {
        throw new Error(
          "Mol* WebGL viewer could not be initialized."
        );
      }

      if (cancelled) {
        instance.dispose();
        return;
      }

      const normalizedPdbId = pdbId
        .trim()
        .toUpperCase();

      const url =
        `https://files.rcsb.org/download/` +
        `${encodeURIComponent(normalizedPdbId)}.cif`;

      console.log(
        "Loading PDB:",
        normalizedPdbId
      );

      const data =
        await instance.builders.data.download({
          url,
          isBinary: false,
        });

      if (cancelled) {
        instance.dispose();
        return;
      }

      const trajectory =
        await instance.builders.structure.parseTrajectory(
          data,
          "mmcif"
        );

      if (cancelled) {
        instance.dispose();
        return;
      }

      await instance.builders.structure.hierarchy.applyPreset(
        trajectory,
        "default"
      );

      console.log(
        "PDB loaded successfully:",
        normalizedPdbId
      );
    }

    init().catch((error) => {
      if (!cancelled) {
        console.error(
          "Mol* initialization error:",
          error
        );
      }
    });

    return () => {
      cancelled = true;

      if (plugin) {
        plugin.dispose();
        plugin = undefined;
      }
    };
  }, [pdbId]);

  return (
    <div
      ref={containerRef}
      className="relative h-[600px] w-full overflow-hidden rounded-xl bg-slate-900"
    />
  );
}