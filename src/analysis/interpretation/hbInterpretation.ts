// src/analysis/interpretation/hbInterpretation.ts

export type HbSeverity = 'normal' | 'mild' | 'moderate' | 'severe';

export type DemographicGroup =
  | 'enfant_moins_6_mois'
  | 'enfant_6_23_mois'
  | 'enfant_24_59_mois'
  | 'enfant_5_11_ans'
  | 'adolescent_12_14_ans'
  | 'homme'
  | 'femme'
  | 'femmeenceinte';

export function categorizeHb(hb: number, group: DemographicGroup): HbSeverity {
  if (typeof hb !== 'number' || isNaN(hb) || hb < 0) {
    return 'severe';
  }

  // WHO 2024 cutoffs, expressed in g/dL.
  if (group === 'enfant_6_23_mois') {
    if (hb >= 10.5) return 'normal';
    if (hb >= 9.5) return 'mild';
    if (hb >= 7) return 'moderate';
    return 'severe';
  }

  if (group === 'enfant_24_59_mois') {
    if (hb >= 11) return 'normal';
    if (hb >= 10) return 'mild';
    if (hb >= 7) return 'moderate';
    return 'severe';
  }

  if (group === 'enfant_5_11_ans') {
    if (hb >= 11.5) return 'normal';
    if (hb >= 11) return 'mild';
    if (hb >= 8) return 'moderate';
    return 'severe';
  }

  if (group === 'adolescent_12_14_ans') {
    if (hb >= 12) return 'normal';
    if (hb >= 11) return 'mild';
    if (hb >= 8) return 'moderate';
    return 'severe';
  }

  if (group === 'homme') {
    if (hb >= 13) return 'normal';
    if (hb >= 11) return 'mild';
    if (hb >= 8) return 'moderate';
    return 'severe';
  }

  if (group === 'femmeenceinte') {
    if (hb >= 11) return 'normal';
    if (hb >= 10) return 'mild';
    if (hb >= 7) return 'moderate';
    return 'severe';
  }

  if (hb >= 12) return 'normal';
  if (hb >= 11) return 'mild';
  if (hb >= 8) return 'moderate';
  return 'severe';
}
