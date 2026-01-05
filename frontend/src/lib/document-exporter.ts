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
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
  infrastructure: 'Infrastructure',
  monitoring: 'Monitoring',
  ci_cd: 'CI/CD',
};

// ============================================
// Markdown Generation Functions
// ============================================

export function generateReadmeMarkdown(spec: TechnicalSpecification): string {
  return `# ${spec.prd.title}

**Version**: v${spec.versionNumber}
**Created**: ${new Date(spec.createdAt).toLocaleDateString()}

## Document Contents

1. [PRD (Product Requirements)](./prd.md)
2. [System Architecture](./architecture.md)
3. [MVP Roadmap](./roadmap.md)
4. [Tech Stack Recommendations](./techstack.md)

## Constraints Summary

- **Budget**: ${spec.constraintsSnapshot.budget?.displayText || 'N/A'}
- **Team Size**: ${spec.constraintsSnapshot.team?.size || 0} people
- **Timeline**: ${spec.constraintsSnapshot.timeline || 'N/A'}
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

## Overview

${prd.overview}

## Requirements

| ID | Priority | Description | Acceptance Criteria |
|----|---------|------|----------|
${requirements}

## User Stories

${userStories}

## Scope

### Included

${included}

### Excluded

${excluded}
`;
}

export function generateArchitectureMarkdown(
  arch: ArchitectureDiagram
): string {
  const components = arch.components
    .map(
      (c) => `### ${c.name}

- **Technology**: ${c.technology}
- **Description**: ${c.description}
- **Responsibilities**:
${c.responsibilities.map((r) => `  - ${r}`).join('\n')}
`
    )
    .join('\n');

  const integrations = arch.integrations.map((i) => `- ${i}`).join('\n');

  return `# System Architecture

## Diagram

\`\`\`mermaid
${arch.diagramCode}
\`\`\`

## Component Details

${components}

## External Integrations

${integrations}
`;
}

export function generateRoadmapMarkdown(roadmap: MVPRoadmap): string {
  const phases = roadmap.phases
    .map(
      (p, i) => `### ${p.name}

- **Duration**: ${p.duration}
- **Milestones**:
${p.milestones.map((m) => `  - ${m}`).join('\n')}
- **Deliverables**:
${p.deliverables.map((d) => `  - ${d}`).join('\n')}
${p.dependencies?.length ? `- **Dependencies**: ${p.dependencies.join(', ')}` : ''}
`
    )
    .join('\n');

  return `# MVP Roadmap

**Total Duration**: ${roadmap.totalDuration}

## Phased Plan

${phases}
`;
}

export function generateTechStackMarkdown(
  techStack: TechStackRecommendation[]
): string {
  const sections = techStack
    .map(
      (t) => `### ${CATEGORY_LABELS[t.category] || t.category}

**Recommended**: ${t.recommended}

**Alternatives**: ${t.alternatives.join(', ')}

**Rationale**: ${t.rationale}

**Estimated Cost**: ${t.estimatedCost}

**Constraint Alignment**:
- Budget: ${t.constraintAlignment.budget}
- Team: ${t.constraintAlignment.team}
- Timeline: ${t.constraintAlignment.timeline}
`
    )
    .join('\n---\n\n');

  return `# Tech Stack Recommendations

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
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = (pdfMakeModule.default || pdfMakeModule) as typeof import('pdfmake/build/pdfmake');
  const pdfFonts = (pdfFontsModule.default || pdfFontsModule) as Record<string, unknown>;
  if (pdfFonts.pdfMake) {
    pdfMake.vfs = (pdfFonts.pdfMake as { vfs: Record<string, string> }).vfs;
  } else if (pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs as Record<string, string>;
  }

  const docDefinition = {
    content: [
      // Title Page
      { text: spec.prd.title, style: 'title' },
      { text: `Version ${spec.versionNumber}`, style: 'subtitle' },
      { text: `Created: ${new Date(spec.createdAt).toLocaleDateString()}`, style: 'date' },
      { text: '\n\n' },

      // PRD Section
      { text: 'PRD (Product Requirements)', style: 'sectionHeader' },
      { text: 'Overview', style: 'subsectionHeader' },
      { text: spec.prd.overview, style: 'body' },
      { text: '\n' },

      { text: 'Requirements', style: 'subsectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', '*'],
          body: [
            ['ID', 'Priority', 'Description', 'Acceptance Criteria'],
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

      { text: 'User Stories', style: 'subsectionHeader' },
      {
        ul: spec.prd.userStories,
      },
      { text: '\n\n', pageBreak: 'after' },

      // Architecture Section
      { text: 'System Architecture', style: 'sectionHeader' },
      { text: 'Components', style: 'subsectionHeader' },
      ...spec.architecture.components.flatMap((c) => [
        { text: c.name, style: 'componentName' },
        { text: `Technology: ${c.technology}`, style: 'body' },
        { text: c.description, style: 'body' },
        { text: 'Responsibilities:', style: 'label' },
        { ul: c.responsibilities },
        { text: '\n' },
      ]),

      { text: 'External Integrations', style: 'subsectionHeader' },
      { ul: spec.architecture.integrations },
      { text: '\n', pageBreak: 'after' },

      // Roadmap Section
      { text: 'MVP Roadmap', style: 'sectionHeader' },
      { text: `Total Duration: ${spec.roadmap.totalDuration}`, style: 'subtitle' },
      { text: '\n' },
      ...spec.roadmap.phases.flatMap((p, i) => [
        { text: `Phase ${i + 1}: ${p.name}`, style: 'phaseHeader' },
        { text: `Duration: ${p.duration}`, style: 'body' },
        { text: 'Milestones:', style: 'label' },
        { ul: p.milestones },
        { text: 'Deliverables:', style: 'label' },
        { ul: p.deliverables },
        { text: '\n' },
      ]),
      { text: '\n', pageBreak: 'after' },

      // Tech Stack Section
      { text: 'Tech Stack Recommendations', style: 'sectionHeader' },
      ...spec.techStack.flatMap((t) => [
        { text: `${CATEGORY_LABELS[t.category] || t.category}: ${t.recommended}`, style: 'techName' },
        { text: `Alternatives: ${t.alternatives.join(', ')}`, style: 'body' },
        { text: t.rationale, style: 'body' },
        { text: `Estimated Cost: ${t.estimatedCost}`, style: 'body' },
        {
          table: {
            widths: ['auto', '*'],
            body: [
              ['Budget', t.constraintAlignment.budget],
              ['Team', t.constraintAlignment.team],
              ['Timeline', t.constraintAlignment.timeline],
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
  const fileName = `${spec.prd.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${version}.zip`;
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
  const fileName = `${spec.prd.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${spec.versionNumber}.pdf`;
  saveAs(blob, fileName);
}
