import type {
  TechnicalSpecification,
  PRDDocument,
  ArchitectureDiagram,
  MVPRoadmap,
  TechStackRecommendation,
  TECH_CATEGORY_LABELS,
  PRIORITY_COLORS,
} from '@/types/stage-c';

// Tech category labels for display
const CATEGORY_LABELS: Record<string, string> = {
  frontend: '프론트엔드',
  backend: '백엔드',
  database: '데이터베이스',
  infrastructure: '인프라',
  monitoring: '모니터링',
  ci_cd: 'CI/CD',
};

// ============================================
// Markdown Generation Functions
// ============================================

export function generateReadmeMarkdown(spec: TechnicalSpecification): string {
  return `# ${spec.prd.title}

**버전**: v${spec.versionNumber}
**생성일**: ${new Date(spec.createdAt).toLocaleDateString('ko-KR')}

## 문서 구성

1. [PRD (제품 요구사항)](./prd.md)
2. [시스템 아키텍처](./architecture.md)
3. [MVP 로드맵](./roadmap.md)
4. [기술 스택 추천](./techstack.md)

## 제약조건 요약

- **예산**: ${spec.constraintsSnapshot.budget?.displayText || 'N/A'}
- **팀 규모**: ${spec.constraintsSnapshot.team?.size || 0}명
- **목표 일정**: ${spec.constraintsSnapshot.timeline || 'N/A'}
`;
}

export function generatePRDMarkdown(prd: PRDDocument): string {
  const requirements = prd.requirements
    .map(
      (r) =>
        `| ${r.id} | ${r.priority} | ${r.description} | ${r.acceptanceCriteria.join('; ')} |`
    )
    .join('\n');

  const userStories = prd.userStories.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const included = prd.scope.included.map((i) => `- ${i}`).join('\n');
  const excluded = prd.scope.excluded.map((e) => `- ${e}`).join('\n');

  return `# ${prd.title}

## 개요

${prd.overview}

## 요구사항

| ID | 우선순위 | 설명 | 수락 기준 |
|----|---------|------|----------|
${requirements}

## 사용자 스토리

${userStories}

## 범위

### 포함

${included}

### 제외

${excluded}
`;
}

export function generateArchitectureMarkdown(
  arch: ArchitectureDiagram
): string {
  const components = arch.components
    .map(
      (c) => `### ${c.name}

- **기술**: ${c.technology}
- **설명**: ${c.description}
- **책임**:
${c.responsibilities.map((r) => `  - ${r}`).join('\n')}
`
    )
    .join('\n');

  const integrations = arch.integrations.map((i) => `- ${i}`).join('\n');

  return `# 시스템 아키텍처

## 다이어그램

\`\`\`mermaid
${arch.diagramCode}
\`\`\`

## 컴포넌트 설명

${components}

## 외부 통합

${integrations}
`;
}

export function generateRoadmapMarkdown(roadmap: MVPRoadmap): string {
  const phases = roadmap.phases
    .map(
      (p, i) => `### ${p.name}

- **기간**: ${p.duration}
- **마일스톤**:
${p.milestones.map((m) => `  - ${m}`).join('\n')}
- **산출물**:
${p.deliverables.map((d) => `  - ${d}`).join('\n')}
${p.dependencies?.length ? `- **의존성**: ${p.dependencies.join(', ')}` : ''}
`
    )
    .join('\n');

  return `# MVP 로드맵

**총 소요 기간**: ${roadmap.totalDuration}

## 단계별 계획

${phases}
`;
}

export function generateTechStackMarkdown(
  techStack: TechStackRecommendation[]
): string {
  const sections = techStack
    .map(
      (t) => `### ${CATEGORY_LABELS[t.category] || t.category}

**추천**: ${t.recommended}

**대안**: ${t.alternatives.join(', ')}

**선택 근거**: ${t.rationale}

**예상 비용**: ${t.estimatedCost}

**제약조건 적합성**:
- 예산: ${t.constraintAlignment.budget}
- 팀: ${t.constraintAlignment.team}
- 일정: ${t.constraintAlignment.timeline}
`
    )
    .join('\n---\n\n');

  return `# 기술 스택 추천

${sections}
`;
}

// ============================================
// Export Functions
// ============================================

/**
 * Generate complete markdown files as a map
 */
export function generateAllMarkdownFiles(
  spec: TechnicalSpecification
): Map<string, string> {
  const files = new Map<string, string>();

  files.set('README.md', generateReadmeMarkdown(spec));
  files.set('prd.md', generatePRDMarkdown(spec.prd));
  files.set('architecture.md', generateArchitectureMarkdown(spec.architecture));
  files.set('roadmap.md', generateRoadmapMarkdown(spec.roadmap));
  files.set('techstack.md', generateTechStackMarkdown(spec.techStack));

  return files;
}

/**
 * Generate PDF using pdfmake
 */
export async function generateSpecificationPDF(
  spec: TechnicalSpecification
): Promise<Blob> {
  // Dynamically import pdfmake to reduce bundle size
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMakeModule: any = await import('pdfmake/build/pdfmake');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfFontsModule: any = await import('pdfmake/build/vfs_fonts');
  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const pdfFonts = pdfFontsModule.default || pdfFontsModule;
  if (pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  } else if (pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs;
  }

  const docDefinition = {
    content: [
      // Title Page
      { text: spec.prd.title, style: 'title' },
      { text: `버전 ${spec.versionNumber}`, style: 'subtitle' },
      { text: `생성일: ${new Date(spec.createdAt).toLocaleDateString('ko-KR')}`, style: 'date' },
      { text: '\n\n' },

      // PRD Section
      { text: 'PRD (제품 요구사항)', style: 'sectionHeader' },
      { text: '개요', style: 'subsectionHeader' },
      { text: spec.prd.overview, style: 'body' },
      { text: '\n' },

      { text: '요구사항', style: 'subsectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', '*'],
          body: [
            ['ID', '우선순위', '설명', '수락 기준'],
            ...spec.prd.requirements.map((r) => [
              r.id,
              r.priority,
              r.description,
              r.acceptanceCriteria.join('\n'),
            ]),
          ],
        },
      },
      { text: '\n' },

      { text: '사용자 스토리', style: 'subsectionHeader' },
      {
        ul: spec.prd.userStories,
      },
      { text: '\n\n', pageBreak: 'after' },

      // Architecture Section
      { text: '시스템 아키텍처', style: 'sectionHeader' },
      { text: '컴포넌트', style: 'subsectionHeader' },
      ...spec.architecture.components.flatMap((c) => [
        { text: c.name, style: 'componentName' },
        { text: `기술: ${c.technology}`, style: 'body' },
        { text: c.description, style: 'body' },
        { text: '책임:', style: 'label' },
        { ul: c.responsibilities },
        { text: '\n' },
      ]),

      { text: '외부 연동', style: 'subsectionHeader' },
      { ul: spec.architecture.integrations },
      { text: '\n', pageBreak: 'after' },

      // Roadmap Section
      { text: 'MVP 로드맵', style: 'sectionHeader' },
      { text: `총 소요 기간: ${spec.roadmap.totalDuration}`, style: 'subtitle' },
      { text: '\n' },
      ...spec.roadmap.phases.flatMap((p, i) => [
        { text: `Phase ${i + 1}: ${p.name}`, style: 'phaseHeader' },
        { text: `기간: ${p.duration}`, style: 'body' },
        { text: '마일스톤:', style: 'label' },
        { ul: p.milestones },
        { text: '산출물:', style: 'label' },
        { ul: p.deliverables },
        { text: '\n' },
      ]),
      { text: '\n', pageBreak: 'after' },

      // Tech Stack Section
      { text: '기술 스택 추천', style: 'sectionHeader' },
      ...spec.techStack.flatMap((t) => [
        { text: `${CATEGORY_LABELS[t.category] || t.category}: ${t.recommended}`, style: 'techName' },
        { text: `대안: ${t.alternatives.join(', ')}`, style: 'body' },
        { text: t.rationale, style: 'body' },
        { text: `예상 비용: ${t.estimatedCost}`, style: 'body' },
        {
          table: {
            widths: ['auto', '*'],
            body: [
              ['예산', t.constraintAlignment.budget],
              ['팀', t.constraintAlignment.team],
              ['일정', t.constraintAlignment.timeline],
            ],
          },
          layout: 'lightHorizontalLines',
        },
        { text: '\n' },
      ]),
    ],
    styles: {
      title: { fontSize: 24, bold: true, margin: [0, 0, 0, 10] },
      subtitle: { fontSize: 14, color: 'gray', margin: [0, 0, 0, 5] },
      date: { fontSize: 10, color: 'gray' },
      sectionHeader: { fontSize: 18, bold: true, margin: [0, 20, 0, 10], color: '#1a56db' },
      subsectionHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      body: { fontSize: 10, margin: [0, 2, 0, 2] },
      label: { fontSize: 10, bold: true, margin: [0, 5, 0, 2] },
      componentName: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
      phaseHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5], color: '#1a56db' },
      techName: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
    },
    defaultStyle: {
      fontSize: 10,
    },
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition as any);
      pdfDocGenerator.getBlob((blob: Blob) => {
        resolve(blob);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Markdown ZIP using JSZip and trigger download
 */
export async function generateSpecificationZIP(
  spec: TechnicalSpecification,
  _ideaId: string,
  version: number
): Promise<void> {
  // Dynamically import JSZip and FileSaver
  const JSZip = (await import('jszip')).default;
  const { saveAs } = await import('file-saver');

  const zip = new JSZip();
  const markdownFiles = generateAllMarkdownFiles(spec);

  // Add all markdown files to the zip
  markdownFiles.forEach((content, filename) => {
    zip.file(filename, content);
  });

  // Generate and download the zip file
  const blob = await zip.generateAsync({ type: 'blob' });
  const fileName = `${spec.prd.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_v${version}.zip`;
  saveAs(blob, fileName);
}

/**
 * Download PDF file
 */
export async function downloadSpecificationPDF(
  spec: TechnicalSpecification
): Promise<void> {
  const { saveAs } = await import('file-saver');
  const blob = await generateSpecificationPDF(spec);
  const fileName = `${spec.prd.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_v${spec.versionNumber}.pdf`;
  saveAs(blob, fileName);
}
