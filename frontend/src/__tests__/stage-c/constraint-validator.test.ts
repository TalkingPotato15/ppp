import {
  validateConstraints,
  isValidationSuccess,
  getDefaultConstraints,
  formatValidationErrors,
  formatValidationWarnings,
} from '@/lib/constraint-validator';
import type { UserConstraints } from '@/types/stage-c';

describe('constraint-validator', () => {
  describe('validateConstraints', () => {
    it('should pass with valid default constraints', () => {
      const constraints = getDefaultConstraints();
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(true);
      expect(isValidationSuccess(result)).toBe(true);
    });

    it('should fail when budget is missing', () => {
      const constraints = {
        ...getDefaultConstraints(),
        budget: undefined as any,
      };
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(false);
      if (!isValidationSuccess(result)) {
        expect(result.errors.some((e) => e.field === 'budget')).toBe(true);
      }
    });

    it('should fail when budget range is missing', () => {
      const constraints: UserConstraints = {
        ...getDefaultConstraints(),
        budget: {
          range: undefined as any,
          displayText: '테스트',
        },
      };
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(false);
    });

    it('should fail when team size is less than 1', () => {
      const constraints: UserConstraints = {
        ...getDefaultConstraints(),
        team: {
          size: 0,
          composition: { junior: 0, middle: 0, senior: 0 },
        },
      };
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(false);
      if (!isValidationSuccess(result)) {
        expect(result.errors.some((e) => e.field === 'team.size')).toBe(true);
      }
    });

    it('should fail when team composition does not match team size', () => {
      const constraints: UserConstraints = {
        ...getDefaultConstraints(),
        team: {
          size: 5,
          composition: { junior: 1, middle: 1, senior: 1 }, // Sum = 3, not 5
        },
      };
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(false);
      if (!isValidationSuccess(result)) {
        expect(result.errors.some((e) => e.field === 'team.composition')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('3'))).toBe(true);
        expect(result.errors.some((e) => e.message.includes('5'))).toBe(true);
      }
    });

    it('should fail when timeline is missing', () => {
      const constraints: UserConstraints = {
        ...getDefaultConstraints(),
        timeline: undefined as any,
      };
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(false);
    });

    it('should warn when low budget with short timeline and large team', () => {
      const constraints: UserConstraints = {
        budget: {
          range: 'UNDER_10M',
          displayText: '1,000만원 미만',
        },
        team: {
          size: 5,
          composition: { junior: 2, middle: 2, senior: 1 },
        },
        timeline: '1_TO_3_MONTHS',
      };
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.warnings?.some((w) => w.includes('예산'))).toBe(true);
      }
    });

    it('should warn when large budget with small team', () => {
      const constraints: UserConstraints = {
        budget: {
          range: 'OVER_200M',
          displayText: '2억원 이상',
        },
        team: {
          size: 2,
          composition: { junior: 1, middle: 0, senior: 1 },
        },
        timeline: '6_TO_12_MONTHS',
      };
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.warnings?.some((w) => w.includes('팀 규모가 작습니다'))).toBe(true);
      }
    });

    it('should warn when all team members are junior', () => {
      const constraints: UserConstraints = {
        budget: {
          range: '10M_TO_50M',
          displayText: '1,000만원 ~ 5,000만원',
        },
        team: {
          size: 3,
          composition: { junior: 3, middle: 0, senior: 0 },
        },
        timeline: '3_TO_6_MONTHS',
      };
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.warnings?.some((w) => w.includes('주니어'))).toBe(true);
      }
    });

    it('should warn when short timeline with large team', () => {
      const constraints: UserConstraints = {
        budget: {
          range: '50M_TO_200M',
          displayText: '5,000만원 ~ 2억원',
        },
        team: {
          size: 8,
          composition: { junior: 2, middle: 4, senior: 2 },
        },
        timeline: '1_TO_3_MONTHS',
      };
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.warnings?.some((w) => w.includes('커뮤니케이션'))).toBe(true);
      }
    });

    it('should warn when too many tech preferences', () => {
      const constraints: UserConstraints = {
        ...getDefaultConstraints(),
        techPreferences: {
          languages: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'], // 11 items
        },
      };
      const result = validateConstraints(constraints);

      expect(result.valid).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.warnings?.some((w) => w.includes('10개'))).toBe(true);
      }
    });
  });

  describe('getDefaultConstraints', () => {
    it('should return sensible defaults', () => {
      const defaults = getDefaultConstraints();

      expect(defaults.budget.range).toBe('10M_TO_50M');
      expect(defaults.team.size).toBe(3);
      expect(defaults.team.composition.junior).toBe(1);
      expect(defaults.team.composition.middle).toBe(1);
      expect(defaults.team.composition.senior).toBe(1);
      expect(defaults.timeline).toBe('3_TO_6_MONTHS');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format errors as bullet points', () => {
      const errors = [
        { field: 'budget', message: '예산 정보가 필요합니다.' },
        { field: 'team', message: '팀 정보가 필요합니다.' },
      ];

      const formatted = formatValidationErrors(errors);

      expect(formatted).toContain('• 예산 정보가 필요합니다.');
      expect(formatted).toContain('• 팀 정보가 필요합니다.');
    });
  });

  describe('formatValidationWarnings', () => {
    it('should format warnings with emoji', () => {
      const warnings = ['경고 1', '경고 2'];

      const formatted = formatValidationWarnings(warnings);

      expect(formatted).toContain('⚠️ 경고 1');
      expect(formatted).toContain('⚠️ 경고 2');
    });
  });
});
