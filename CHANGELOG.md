# Changelog — doc2fill

## [Unreleased]

### Fixed
- **tests/extension/content.test.js**: Adicionados mocks `focus()` e `closest()` nos objetos de input simulados para compatibilidade com `fillInputElement`, que chama esses métodos nativos do DOM internamente. Corrige 3 testes que falhavam com `TypeError: input.focus is not a function`.

### Added
- **extension/content.js**: Engine content script com exposição global (`globalThis.__doc2fill_content_engine`) para testes headless.
- **core/matcher.js**: Vocabulário CCHAR (termos clínicos como `tuss_ambulatorial`, `fld_especialidade`, `laudo_pericial`).
- Suíte completa de testes unitários (27 cenários) cobrindo matcher, classifier, clinical-translator e content engine.
