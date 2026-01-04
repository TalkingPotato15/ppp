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
    errors.push({ field: 'budget', message: '예산 정보가 필요합니다.' });
  } else {
    if (!constraints.budget.range) {
      errors.push({ field: 'budget.range', message: '예산 범위를 선택해주세요.' });
    }
    if (!constraints.budget.displayText) {
      errors.push({
        field: 'budget.displayText',
        message: '예산 표시 텍스트가 필요합니다.',
      });
    }
    if (
      constraints.budget.specificAmount !== undefined &&
      constraints.budget.specificAmount < 0
    ) {
      errors.push({
        field: 'budget.specificAmount',
        message: '예산은 0 이상이어야 합니다.',
      });
    }
  }

  // Team validation
  if (!constraints.team) {
    errors.push({ field: 'team', message: '팀 정보가 필요합니다.' });
  } else {
    if (!constraints.team.size || constraints.team.size < 1) {
      errors.push({
        field: 'team.size',
        message: '팀 규모는 최소 1명 이상이어야 합니다.',
      });
    }
    if (!constraints.team.composition) {
      errors.push({
        field: 'team.composition',
        message: '팀 구성 정보가 필요합니다.',
      });
    } else {
      const { junior, middle, senior } = constraints.team.composition;
      const total = (junior || 0) + (middle || 0) + (senior || 0);
      if (total !== constraints.team.size) {
        errors.push({
          field: 'team.composition',
          message: `팀 구성원 합계(${total})가 팀 규모(${constraints.team.size})와 일치하지 않습니다.`,
        });
      }
      if (junior < 0 || middle < 0 || senior < 0) {
        errors.push({
          field: 'team.composition',
          message: '팀 구성원 수는 0 이상이어야 합니다.',
        });
      }
    }
  }

  // Timeline validation
  if (!constraints.timeline) {
    errors.push({ field: 'timeline', message: '목표 일정을 선택해주세요.' });
  }

  // Tech preferences validation (optional)
  if (constraints.techPreferences) {
    const { languages, frameworks, platforms } = constraints.techPreferences;
    if (languages && languages.length > 10) {
      warnings.push('선호 언어가 10개를 초과합니다. 핵심 언어만 선택을 권장합니다.');
    }
    if (frameworks && frameworks.length > 10) {
      warnings.push(
        '선호 프레임워크가 10개를 초과합니다. 핵심 프레임워크만 선택을 권장합니다.'
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
        '낮은 예산과 짧은 일정에 팀 규모가 큽니다. 예산 또는 일정 조정을 권장합니다.'
      );
    }

    // Large budget + small team warning
    if (
      (constraints.budget.range === '50M_TO_200M' ||
        constraints.budget.range === 'OVER_200M') &&
      constraints.team.size < 3
    ) {
      warnings.push(
        '예산 대비 팀 규모가 작습니다. 외주 개발 또는 팀 확장을 고려해보세요.'
      );
    }

    // All junior team warning
    if (
      constraints.team.composition.junior === constraints.team.size &&
      constraints.team.size > 1
    ) {
      warnings.push(
        '팀 전원이 주니어입니다. 시니어 개발자 추가를 권장합니다.'
      );
    }

    // Short timeline + large team warning
    if (
      constraints.timeline === '1_TO_3_MONTHS' &&
      constraints.team.size > 5
    ) {
      warnings.push(
        '짧은 일정에 팀 규모가 큽니다. 커뮤니케이션 오버헤드로 효율이 떨어질 수 있습니다.'
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
      displayText: '1,000만원 ~ 5,000만원',
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
