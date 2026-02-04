import type { IntakeAnswers } from './schema';

export type PatientSex = 'male' | 'female';

export interface IntakeFlags {
  flag_low_velocity: boolean;
  flag_secondary_cause: boolean;
  flag_puberty_early: boolean;
  flag_family_history: boolean;
}

const toBool = (value: unknown) => value === true || value === 'true' || value === 'yes';

export const computeIntakeFlags = (answers: IntakeAnswers, sex: PatientSex): IntakeFlags => {
  const flag_low_velocity = toBool(answers.height_gain_under_5cm) || toBool(answers.slow_growth_1y);
  const flag_secondary_cause = toBool(answers.long_steroid) || toBool(answers.treated_disease);
  const flag_family_history =
    toBool(answers.short_parent) || toBool(answers.early_puberty_family) || toBool(answers.early_stop_growth_family);

  let flag_puberty_early = false;
  if (toBool(answers.signs_early)) {
    flag_puberty_early = true;
  } else if (answers.signs_start_age !== null && answers.signs_start_age !== undefined && answers.signs_start_age !== '') {
    const age = Number(answers.signs_start_age);
    if (!Number.isNaN(age)) {
      if (sex === 'female' && age < 8) flag_puberty_early = true;
      if (sex === 'male' && age < 9) flag_puberty_early = true;
    }
  }

  return {
    flag_low_velocity,
    flag_secondary_cause,
    flag_puberty_early,
    flag_family_history,
  };
};
