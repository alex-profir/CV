// What a spec view shows for one view, from the requirement data (007
// data-model.md The spec view): its groups in spec number order, each with
// its requirements in ID order and the count of the spec's active ones it
// doesn't list. Pure, so the site check groups exactly as the page does.
import type { ViewId } from '@cv/os-core';
import type { RequirementData, RequirementRecord, SpecRecord } from '../../scripts/requirements/index.ts';
import { shortCommit } from '../format/repository.ts';

export type SpecGroupModel = { spec: SpecRecord; requirements: RequirementRecord[]; notShown: number };

export type SpecViewModel = {
  view: ViewId;
  title: string;
  groups: SpecGroupModel[];
  total: number;
  version: { commit: string; short: string; dirty: boolean };
};

// The data's view a view lists: About this site lists the shell's own.
export const dataView = (view: ViewId) => (view === 'about' ? 'shell' : view);

export function deriveView(data: RequirementData, view: ViewId, title: string): SpecViewModel {
  const ids = data.views[dataView(view)] ?? [];
  const byFeature = new Map<string, RequirementRecord[]>();
  for (const id of ids) {
    const requirement = data.requirements[id];
    if (requirement === undefined) continue;
    const list = byFeature.get(requirement.feature) ?? [];
    list.push(requirement);
    byFeature.set(requirement.feature, list);
  }
  const groups = [...data.specs]
    .sort((a, b) => a.number.localeCompare(b.number))
    .flatMap((spec): SpecGroupModel[] => {
      const requirements = byFeature.get(spec.feature);
      if (requirements === undefined) return [];
      requirements.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
      return [{ spec, requirements, notShown: Math.max(0, spec.active - requirements.length) }];
    });
  return {
    view,
    title,
    groups,
    total: groups.reduce((sum, group) => sum + group.requirements.length, 0),
    version: { commit: data.version.commit, short: shortCommit(data.version.commit), dirty: data.version.dirty },
  };
}
