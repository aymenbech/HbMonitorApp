// src/ml/hbCategorize.ts
export type DemographicGroup = 'homme' | 'femme' | 'femmeenceinte';

export type HbCategory =
  | 'anémie sévère'
  | 'anémie modérée'
  | 'anémie légère'
  | 'normale';

export function categorizeHb(hb: number, group: DemographicGroup): HbCategory {
  const thresholdsByGroup: Record<DemographicGroup, {
    severe: number;
    moderate: number;
    mild: number;
  }> = {
    homme: {
      severe: 8.0,
      moderate: 11.0,
      mild: 13.0,
    },
    femme: {
      severe: 8.0,
      moderate: 11.0,
      mild: 12.0,
    },
    femmeenceinte: {
      severe: 7.0,
      moderate: 10.0,
      mild: 11.0,
    },
  };

  const t = thresholdsByGroup[group];

  if (hb < t.severe) {
    return 'anémie sévère';
  } else if (hb < t.moderate) {
    return 'anémie modérée';
  } else if (hb < t.mild) {
    return 'anémie légère';
  } else {
    return 'normale';
  }
}