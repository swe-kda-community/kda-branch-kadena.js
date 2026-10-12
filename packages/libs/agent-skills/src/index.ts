// Types
export type {
  AgentSkill,
  SkillContext,
  SkillResult,
  SkillRegistry,
  SkillSetConfig,
} from './types.js';
export { DEFAULT_CONTEXT } from './types.js';

// Wallet skills
export {
  getBalanceSkill,
  accountExistsSkill,
  describeTransferSkill,
  walletSkills,
} from './skills/wallet.js';

// DeFi skills
export {
  getSwapQuoteSkill,
  describeLiquiditySkill,
  defiSkills,
} from './skills/defi.js';

// Contract skills
export {
  describeModuleSkill,
  listModulesSkill,
  contractSkills,
} from './skills/contracts.js';

// Monitoring skills
export {
  pollTransactionSkill,
  getBlockHeightSkill,
  monitoringSkills,
} from './skills/monitoring.js';

// All skills registry helper
import { walletSkills } from './skills/wallet.js';
import { defiSkills } from './skills/defi.js';
import { contractSkills } from './skills/contracts.js';
import { monitoringSkills } from './skills/monitoring.js';
import type { AgentSkill, SkillRegistry } from './types.js';

export const ALL_SKILLS: AgentSkill[] = [
  ...walletSkills,
  ...defiSkills,
  ...contractSkills,
  ...monitoringSkills,
];

export function createSkillRegistry(
  skills: AgentSkill[] = ALL_SKILLS,
): SkillRegistry {
  const registry: SkillRegistry = new Map();
  for (const skill of skills) {
    registry.set(skill.id, skill);
  }
  return registry;
}
