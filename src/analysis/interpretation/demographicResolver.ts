import type {DemographicGroup} from './hbInterpretation';

export type SexType = 'male' | 'female' | null;
export type PregnancyStatus = 'not_pregnant' | 'pregnant' | 'unknown' | null;

export type UserMedicalProfile = {
  sex: SexType;
  pregnancy_status: PregnancyStatus;
  date_of_birth: string | null;
};

export type AgeInfo = {
  years: number;
  monthsTotal: number;
};

export function calculateAgeInfo(dateOfBirth: string | null): AgeInfo | null {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  const days = today.getDate() - dob.getDate();

  if (days < 0) months -= 1;

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const monthsTotal = years * 12 + months;

  return {
    years: Math.max(0, years),
    monthsTotal: Math.max(0, monthsTotal),
  };
}

export function resolveDemographicGroup(
  medicalProfile: UserMedicalProfile | null,
): DemographicGroup {
  const ageInfo = calculateAgeInfo(medicalProfile?.date_of_birth ?? null);

  if (ageInfo) {
    if (ageInfo.monthsTotal < 6) {
      return 'enfant_moins_6_mois';
    }

    if (ageInfo.monthsTotal >= 6 && ageInfo.monthsTotal <= 23) {
      return 'enfant_6_23_mois';
    }

    if (ageInfo.monthsTotal >= 24 && ageInfo.monthsTotal <= 59) {
      return 'enfant_24_59_mois';
    }

    if (ageInfo.years >= 5 && ageInfo.years <= 11) {
      return 'enfant_5_11_ans';
    }

    if (ageInfo.years >= 12 && ageInfo.years <= 14) {
      return 'adolescent_12_14_ans';
    }
  }

  if (
    medicalProfile?.sex === 'female' &&
    medicalProfile?.pregnancy_status === 'pregnant'
  ) {
    return 'femmeenceinte';
  }

  if (medicalProfile?.sex === 'male') {
    return 'homme';
  }

  return 'femme';
}

export function getDemographicLabel(group: DemographicGroup): string {
  switch (group) {
    case 'enfant_moins_6_mois':
      return 'Infant under 6 months';
    case 'enfant_6_23_mois':
      return 'Child 6–23 months';
    case 'enfant_24_59_mois':
      return 'Child 24–59 months';
    case 'enfant_5_11_ans':
      return 'Child 5–11 years';
    case 'adolescent_12_14_ans':
      return 'Adolescent 12–14 years';
    case 'homme':
      return 'Adult male';
    case 'femme':
      return 'Adult female';
    case 'femmeenceinte':
      return 'Pregnant female';
    default:
      return 'Unknown';
  }
}
