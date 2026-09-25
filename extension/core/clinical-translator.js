/**
 * doc2fill - Core Clinical Translator & Anti-Glosa Ontological Engine
 * Zero dependencies, pure JS, client-side execution, R$ 0,00 cost.
 * Strategy Pattern architecture aligned with TUSS/CBHPM (ANS).
 */

import { normalizeText } from './matcher.js';

export const CLINICAL_ONTOLOGY_DICTIONARY = {
  // 1. Odontologia Funcional vs Estética
  lente_dental: {
    keywords: ['lente', 'lentes', 'lente de contato', 'faceta', 'facetas', 'clareamento', 'estetica dental'],
    category: 'odontologia',
    natureza: 'Não Cirúrgico (Ambulatorial)',
    descricaoTecnica: 'Reabilitação funcional por meio de facetas cerâmicas laminadas para restabelecimento da oclusão e readequação da dimensão vertical.',
    motivoNecessidade: 'Disfunção mastigatória decorrente de severo desgaste oclusal e perda estrutural de esmalte, visando recompor a guia canina anterior e prevenir lesões endodônticas.'
  },
  clareamento_dental: {
    keywords: ['clareamento', 'clareamento dental', 'clareamento a laser'],
    category: 'odontologia',
    natureza: 'Não Cirúrgico (Ambulatorial)',
    descricaoTecnica: 'Tratamento odontológico cromático para remoção de pigmentações intrínsecas e descoloração por trauma ou terapia endodôntica.',
    motivoNecessidade: 'Correção de discromia dental patológica pós-tratamento de canal e reabilitação biológica do elemento dental afetado.'
  },

  // 2. Dermatologia e Tricologia (Capilar)
  implante_capilar: {
    keywords: ['implante capilar', 'transplante capilar', 'queda de cabelo', 'calvicie', 'cabelo', 'fue', 'fut'],
    category: 'dermatologia',
    natureza: 'Cirúrgico',
    descricaoTecnica: 'Intervenção cirúrgica reparadora com microenxertos foliculares autólogos para tratamento de Alopecia Androgenética / Alopecia Areata.',
    motivoNecessidade: 'Atrofia folicular progressiva refratária ao tratamento farmacológico tópico e sistêmico, com indicação reparadora de reconstrução capilar.'
  },

  // 3. Procedimentos com Toxina Botulínica e Preenchedores
  botox: {
    keywords: ['botox', 'toxina', 'toxina botulinica', 'dysport', 'botulift'],
    category: 'neurologia_odontologia',
    natureza: 'Não Cirúrgico (Ambulatorial)',
    descricaoTecnica: 'Aplicação terapêutica de Toxina Botulínica Tipo A em pontos neuromusculares específicos.',
    motivoNecessidade: 'Tratamento de hiperatividade muscular orofacial, bruxismo severo e cefaleia tensional refratária com sobrecarga na articulação temporomandibular (ATM).'
  },
  preenchimento: {
    keywords: ['preenchimento', 'acido hialuronico', 'harmonizacao', 'harmonizacao facial', 'labios', 'olheiras'],
    category: 'dermatologia_reparadora',
    natureza: 'Não Cirúrgico (Ambulatorial)',
    descricaoTecnica: 'Reposição volumétrica dérmica com biomaterial viscoelástico para reconstituição tecidual funcional.',
    motivoNecessidade: 'Reabilitação de perda volumétrica e atrofia tecidual decorrente de disfunção neuromuscular ou assimetria facial pós-traumática.'
  },

  // 4. Cirurgia Plástica e Otorrinolaringologia Funcional
  rinoplastia: {
    keywords: ['rinoplastia', 'nariz', 'ponta nasal', 'dorso nasal'],
    category: 'otorrinolaringologia_cirurgica',
    natureza: 'Cirúrgico',
    descricaoTecnica: 'Rinosseptoplastia funcional com correção de desvio de septo e insuficiência de válvula nasal.',
    motivoNecessidade: 'Obstrução respiratória crônica, colapso de válvula nasal externa e alteração funcional do fluxo aéreo nasofaríngeo.'
  },
  blefaroplastia: {
    keywords: ['blefaroplastia', 'palpebra', 'palpebras', 'bolsas nos olhos'],
    category: 'oftalmologia_cirurgica',
    natureza: 'Cirúrgico',
    descricaoTecnica: 'Blefaroplastia funcional corretiva bilateral por dermatocalase severa.',
    motivoNecessidade: 'Excesso de pele palpebral superior gerando obstrução mecânica comprovada do campo visual superior e astenopia refratária.'
  },
  abdominoplastia: {
    keywords: ['abdominoplastia', 'lipo', 'lipoaspiracao', 'barriga', 'flacidez abdominal'],
    category: 'cirurgia_reparadora',
    natureza: 'Cirúrgico',
    descricaoTecnica: 'Dermolipectomia abdominal reparadora com plicatura de diástase dos músculos retos abdominais.',
    motivoNecessidade: 'Diástase severa dos retos abdominais com instabilidade postural e hérnia ventral pós-gestacional ou pós-bariátrica.'
  }
};

/**
 * Estratégia Padrão: Dicionário Ontológico Local
 */
export class LocalDictionaryStrategy {
  constructor(dictionary = CLINICAL_ONTOLOGY_DICTIONARY) {
    this.dictionary = { ...dictionary };
  }

  register(key, definition) {
    this.dictionary[key] = {
      keywords: definition.keywords || [key],
      ...definition
    };
  }

  translate(inputDescription) {
    if (!inputDescription || typeof inputDescription !== 'string') {
      return {
        matched: false,
        descricaoTecnica: '',
        motivoNecessidade: '',
        natureza: 'Não Cirúrgico (Ambulatorial)'
      };
    }

    const normInput = normalizeText(inputDescription);
    if (!normInput) {
      return {
        matched: false,
        descricaoTecnica: '',
        motivoNecessidade: '',
        natureza: 'Não Cirúrgico (Ambulatorial)'
      };
    }

    // Busca na base ontológica
    for (const [key, item] of Object.entries(this.dictionary)) {
      const keywords = item.keywords || [key];
      const match = keywords.some(kw => {
        const normKw = normalizeText(kw);
        return normKw && normInput.includes(normKw);
      });

      if (match) {
        return {
          matched: true,
          key,
          category: item.category,
          natureza: item.natureza,
          descricaoTecnica: item.descricaoTecnica,
          motivoNecessidade: item.motivoNecessidade
        };
      }
    }

    // Fallback gracioso: termo não encontrado
    return {
      matched: false,
      descricaoTecnica: inputDescription.trim(),
      motivoNecessidade: 'Avaliação e acompanhamento clínico especializado.',
      natureza: 'Não Cirúrgico (Ambulatorial)'
    };
  }
}

/**
 * Motor Principal com Strategy Pattern (Extensível para IA futura)
 */
export class ClinicalOntologyEngine {
  constructor(strategy = new LocalDictionaryStrategy()) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  registerProcedure(key, definition) {
    if (this.strategy && typeof this.strategy.register === 'function') {
      this.strategy.register(key, definition);
    }
  }

  translate(description) {
    return this.strategy.translate(description);
  }
}

// Instância padrão singleton
const defaultEngine = new ClinicalOntologyEngine();

export function translateClinicalProcedure(description) {
  return defaultEngine.translate(description);
}
