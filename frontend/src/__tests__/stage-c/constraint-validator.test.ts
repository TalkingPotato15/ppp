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
          displayText: 'test',
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
          displayText: 'Under ₩10M',
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
        expect(result.warnings?.some((w) => w.includes('budget'))).toBe(true);
      }
    });

    it('should warn when large budget with small team', () => {
      const constraints: UserConstraints = {
        budget: {
          range: 'OVER_200M',
          displayText: 'Over ₩200M',
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
        expect(result.warnings?.some((w) => w.includes('Team size is small'))).toBe(true);
      }
    });

    it('should warn when all team members are junior', () => {
      const constraints: UserConstraints = {
        budget: {
          range: '10M_TO_50M',
          displayText: '₩10M ~ ₩50M',
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
        expect(result.warnings?.some((w) => w.includes('juniors'))).toBe(true);
      }
    });

    it('should warn when short timeline with large team', () => {
      const constraints: UserConstraints = {
        budget: {
          range: '50M_TO_200M',
          displayText: '₩50M ~ ₩200M',
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
        expect(result.warnings?.some((w) => w.includes('communication'))).toBe(true);
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
        expect(result.warnings?.some((w) => w.includes('10'))).toBe(true);
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
        { field: 'budget', message: 'Budget information is required.' },
        { field: 'team', message: 'Team information is required.' },
      ];

      const formatted = formatValidationErrors(errors);

      expect(formatted).toContain('• Budget information is required.');
      expect(formatted).toContain('• Team information is required.');
    });
  });

  describe('formatValidationWarnings', () => {
    it('should format warnings with emoji', () => {
      const warnings = ['Warning 1', 'Warning 2'];

      const formatted = formatValidationWarnings(warnings);

      expect(formatted).toContain('⚠️ Warning 1');
      expect(formatted).toContain('⚠️ Warning 2');
    });
  });
