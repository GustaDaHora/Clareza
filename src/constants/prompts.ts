// src/constants/prompts.ts
export const PROMPTS = {
  grammarCorrection: `Revise exclusivamente o texto do arquivo destacado, mantendo a língua portuguesa do Brasil. Ajuste apenas aspectos gramaticais (ortografia, pontuação, concordância verbal e nominal, regência, coesão e fluxo). Não altere estilo de escrita, vocabulário autoral, nomes próprios, citações, trechos exemplificativos ou qualquer elemento que não seja erro gramatical. Mantenha 100% da ideia e do conteúdo original, sem adicionar ou remover informações. O resultado deve ser o mesmo texto corrigido, preservando a voz do autor. @file_reference`,

  styleImprovements: `Reescreva o texto do arquivo destacado em português do Brasil, mantendo integralmente as ideias originais. O objetivo é melhorar clareza, concisão e impacto, tornando a leitura mais fluida e envolvente Não adicione informações novas, não mude o tom autoral e não altere o conteúdo factual. O resultado deve ser o mesmo texto reescrito, apenas com aprimoramento de estilo. @file_reference`,

  simplifyText: `Reescreva o texto do arquivo destacado em português do Brasil, preservando integralmente a ideia e o conteúdo original. O objetivo é simplificar construções complexas, tornando a leitura acessível e direta para qualquer público. Não omita informações importantes, não adicione conteúdo novo e não altere o tom de voz do autor. O resultado deve ser o mesmo texto reescrito de forma mais simples e clara. @file_reference`,

  expandText: `Expanda o texto do arquivo destacado em português do Brasil, mantendo fielmente a ideia original. Adicione apenas detalhes explicativos, exemplos ou descrições que tornem o conteúdo mais completo e natural. Não altere o tom do autor, não modifique fatos e não insira informações irrelevantes. O resultado deve ser o mesmo texto reescrito com mais riqueza de detalhes, mas preservando sua essência. @file_reference`,

  originalityCheck: `Analise o texto do arquivo destacado em português do Brasil para identificar trechorepetitivos, frases clichês ou construções genéricas. Não faça alterações diretas no texto. Apresente uma lista de observações claras, apontando quais partes podem comprometer a originalidade e sugerindo alternativas mais autênticas. O resultado deve ser apenas uma análise com sugestões, sem reescrever integralmente o texto. @file_reference`,

  generativeSuggestions: `Com base no texto do arquivo destacado em português do Brasil, gere rascunhos alternativos ou ideias adicionais para brainstorming. Mantenha o contexto do texto original, mas explore variações criativas que possam inspirar novas abordagens. Não descarte o conteúdo existente, apenas ofereça alternativas de como poderia ser desenvolvido. O resultado deve ser uma lista de sugestões ou versões alternativas, não uma substituição integral do texto. @file_reference`,

  otherSuggestions: `Analise o texto do arquivo destacado em português do Brasil para verificar consistência, fluxo lógico e clareza narrativa. Não reescreva integralmente o texto. Apresente recomendações objetivas sobre possíveis melhorias estruturais ou de organização de ideias, sempre preservando a intenção do autor. O resultado deve ser apenas uma lista de sugestões pontuais, não uma versão reescrita. @file_reference`,

  toneAdjustment: `Reescreva o texto do arquivo destacado em português do Brasil, ajustando exclusivamente o tom da escrita conforme a solicitação do usuário (ex.: mais formal, mais casual, mais persuasivo, mais neutro). Mantenha integralmente a ideia e o conteúdo original, sem adicionar ou remover informações. Não altere a gramática correta, apenas adapte o tom da narrativa. O resultado deve ser o mesmo texto, preservando a voz do autor, mas com o tom solicitado. @file_reference`,

};
