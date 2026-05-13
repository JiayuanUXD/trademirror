"use client";

import { useState, useEffect } from "react";

export type AppSettings = {
  displayName: string;
  maxPositionPct: number;     // single stock position limit %
  weeklyTradeLimit: number;   // max trades per week
  defaultStopLossPct: number; // default stop-loss % from entry
  totalCapital: number;       // approx total account size in CNY
};

const DEFAULTS: AppSettings = {
  displayName: "",
  maxPositionPct: 25,
  weeklyTradeLimit: 2,
  defaultStopLossPct: 10,
  totalCapital: 0,
};

const STORAGE_KEY = "trademirror_settings";

function load(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULTS;
  }
}

function save(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(load());
    setLoaded(true);
  }, []);

  function update(patch: Partial<AppSettings>) {
    setSettings((s) => {
      const next = { ...s, ...patch };
      save(next);
      return next;
    });
  }

  return { settings, update, loaded };
}
