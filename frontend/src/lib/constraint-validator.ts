import type {
  UserConstraints,
  BudgetRange,
  Timeline,
  ValidationResponse,
  ValidationError,
  ValidationErrorResponse,
} from '@/types/stage-c';

/**
 * Validate user constraints before specification generation
 * Returns validation result with errors or warnings
 */
export function validateConstraints(
  constraints: UserConstraints
): ValidationResponse | ValidationErrorResponse {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Budget validation
  if (!constraints.budget) {
    errors.push({ field: 'budget', message: 'Budget information is required.' });
  } else {
    if (!constraints.budget.range) {
      errors.push({ field: 'budget.range', message: 'Please select a budget range.' });
    }
    if (!constraints.budget.displayText) {
      errors.push({
        field: 'budget.displayText',
        message: 'Budget display text is required.',
      });
    }
    if (
      constraints.budget.specificAmount !== undefined &&
      constraints.budget.specificAmount < 0
    ) {
      errors.push({
        field: 'budget.specificAmount',
        message: 'Budget must be greater than or equal to 0.',
      });
    }
  }

  // Team validation
  if (!constraints.team) {
    errors.push({ field: 'team', message: 'Team information is required.' });
  } else {
    if (!constraints.team.size || constraints.team.size < 1) {
      errors.push({
        field: 'team.size',
        message: 'Team size must be at least 1 person.',
      });
    }
    if (!constraints.team.composition) {
      errors.push({
        field: 'team.composition',
        message: 'Team composition information is required.',
      });
    } else {
      const { junior, middle, senior } = constraints.team.composition;
      const total = (junior || 0) + (middle || 0) + (senior || 0);
      if (total !== constraints.team.size) {
        errors.push({
          field: 'team.composition',
          message: `Total team members (${total}) do not match team size (${constraints.team.size}).`,
        });
      }
      if (junior < 0 || middle < 0 || senior < 0) {
        errors.push({
          field: 'team.composition',
          message: 'Number of team members must be greater than or equal to 0.',
        });
      }
    }
  }

  // Timeline validation
  if (!constraints.timeline) {
    errors.push({ field: 'timeline', message: 'Please select a target timeline.' });
  }

  // Tech preferences validation (optional)
  if (constraints.techPreferences) {
    const { languages, frameworks, platforms } = constraints.techPreferences;
    if (languages && languages.length > 10) {
      warnings.push('More than 10 preferred languages selected. We recommend selecting only core languages.');
    }
    if (frameworks && frameworks.length > 10) {
      warnings.push(
        'More than 10 preferred frameworks selected. We recommend selecting only core frameworks.'
      );
    }
  }

  // Logical consistency checks (warnings)
  if (constraints.budget && constraints.timeline && constraints.team) {
    // Low budget + short timeline warning
    if (
      constraints.budget.range === 'UNDER_10M' &&
      constraints.timeline === '1_TO_3_MONTHS' &&
      constraints.team.size > 3
    ) {
      warnings.push(
        'Team size is large for the low budget and short timeline. Consider adjusting budget or timeline.'
      );
    }

    // Large budget + small team warning
    if (
      (constraints.budget.range === '50M_TO_200M' ||
        constraints.budget.range === 'OVER_200M') &&
      constraints.team.size < 3
    ) {
      warnings.push(
        'Team size is small for the budget. Consider outsourcing or expanding the team.'
      );
    }

    // All junior team warning
    if (
      constraints.team.composition.junior === constraints.team.size &&
      constraints.team.size > 1
    ) {
      warnings.push(
        'All team members are juniors. We recommend adding a senior developer.'
      );
    }

    // Short timeline + large team warning
    if (
      constraints.timeline === '1_TO_3_MONTHS' &&
      constraints.team.size > 5
    ) {
      warnings.push(
        'Team size is large for the short timeline. Efficiency may drop due to communication overhead.'
      );
    }
  }

  // Return errors if any
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  // Return success with optional warnings
  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check if validation result indicates success
 */
export function isValidationSuccess(
  result: ValidationResponse | ValidationErrorResponse
): result is ValidationResponse {
  return result.valid === true;
}

/**
 * Get default constraints for form initialization
 */
export function getDefaultConstraints(): UserConstraints {
  return {
    budget: {
      range: '10M_TO_50M',
      displayText: '₩10M ~ ₩50M',
    },
    team: {
      size: 3,
      composition: {
        junior: 1,
        middle: 1,
        senior: 1,
      },
    },
    timeline: '3_TO_6_MONTHS',
    techPreferences: undefined,
    existingInfrastructure: undefined,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => `• ${e.message}`).join('\n');
}

/**
 * Format validation warnings for display
 */
export function formatValidationWarnings(warnings: string[]): string {
  return warnings.map((w) => `⚠️ ${w}`).join('\n');
}
