// src/analysis/interpretation/hbInterpretation.ts

export type HbSeverity = 'normal' | 'mild' | 'moderate' | 'severe';

export type DemographicGroup =
  | 'enfant_6_59_mois'
  | 'enfant_5_11_ans'
  | 'adolescent_12_14_ans'
  | 'homme'
  | 'femme'
  | 'femmeenceinte';

export function categorizeHb(
  hb: number,
  group: DemographicGroup,
): HbSeverity {
  // Validate input
  if (typeof hb !== 'number' || isNaN(hb) || hb < 0) {
    return 'severe';
  }

  // Children 6–59 months
  if (group === 'enfant_6_59_mois') {
    if (hb >= 11) return 'normal';
    if (hb >= 10) return 'mild';
    if (hb >= 7) return 'moderate';
    return 'severe';
  }

  // Children 5–11 years
  if (group === 'enfant_5_11_ans') {
    if (hb >= 11.5) return 'normal';
    if (hb >= 11) return 'mild';
    if (hb >= 8) return 'moderate';
    return 'severe';
  }

  // Adolescents 12–14 years
  if (group === 'adolescent_12_14_ans') {
    if (hb >= 12) return 'normal';
    if (hb >= 11) return 'mild';
    if (hb >= 8) return 'moderate';
    return 'severe';
  }

  // Adult males
  if (group === 'homme') {
    if (hb >= 13) return 'normal';
    if (hb >= 11) return 'mild';
    if (hb >= 8) return 'moderate';
    return 'severe';
  }

  // Pregnant females
  if (group === 'femmeenceinte') {
    if (hb >= 11) return 'normal';
    if (hb >= 10) return 'mild';
    if (hb >= 7) return 'moderate';
    return 'severe';
  }

  // Adult non‑pregnant females (default)
  if (hb >= 12) return 'normal';
  if (hb >= 11) return 'mild';
  if (hb >= 8) return 'moderate';
  return 'severe';
}