// tests/core/history-store.test.js
// Suíte TDD para Armazenamento Local Rotativo de Histórico (IndexedDB / Local-First)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveDocumentToHistory,
  getRecentHistory,
  clearHistory,
  createMemoryStorage
} from '../../core/history-store.js';

describe('core/history-store.js - Histórico Local Rotativo (TDD)', () => {
  describe('saveDocumentToHistory & getRecentHistory', () => {
    it('Cenário 1 (Happy Path): salva documento processado e recupera com id e timestamp gerados', async () => {
      const storage = createMemoryStorage();
      const doc = {
        fornecedor: 'POSTO BRASIL LTDA',
        valor: '150,00',
        data: '12/10/2026',
        tipo_documento: 'Nota Fiscal'
      };

      const saved = await saveDocumentToHistory(doc, storage);
      assert.ok(saved.id.startsWith('doc-'));
      assert.ok(saved.timestamp);
      assert.equal(saved.fornecedor, 'POSTO BRASIL LTDA');

      const history = await getRecentHistory(storage);
      assert.equal(history.length, 1);
      assert.equal(history[0].id, saved.id);
    });

    it('Cenário 2 (Edge Case - Rotação LRU de 10 Itens): descarta automaticamente registros antigos ao exceder 10 itens', async () => {
      const storage = createMemoryStorage();

      // Insere 15 documentos consecutivos
      for (let i = 1; i <= 15; i++) {
        await saveDocumentToHistory({
          fornecedor: `Fornecedor ${i}`,
          valor: `${i * 10},00`,
          data: '12/10/2026'
        }, storage, 10);
      }

      const history = await getRecentHistory(storage);
      assert.equal(history.length, 10, 'Deve manter estritamente 10 registros');
      // O primeiro do array deve ser o mais recente (Fornecedor 15)
      assert.equal(history[0].fornecedor, 'Fornecedor 15');
      // O último do array deve ser o Fornecedor 6 (os de 1 a 5 foram expurgados)
      assert.equal(history[9].fornecedor, 'Fornecedor 6');
    });

    it('Cenário 3 (Error Path): lida com documento nulo, indefinido ou inválido sem corromper storage', async () => {
      const storage = createMemoryStorage();
      const resNull = await saveDocumentToHistory(null, storage);
      assert.equal(resNull, null);

      const resEmpty = await saveDocumentToHistory({}, storage);
      assert.equal(resEmpty, null);

      const history = await getRecentHistory(storage);
      assert.deepEqual(history, []);
    });
  });

  describe('clearHistory', () => {
    it('Cenário 1 (Happy Path): purga todos os registros do histórico com segurança', async () => {
      const storage = createMemoryStorage();
      await saveDocumentToHistory({ fornecedor: 'Empresa A', valor: '50,00' }, storage);
      await saveDocumentToHistory({ fornecedor: 'Empresa B', valor: '80,00' }, storage);

      const before = await getRecentHistory(storage);
      assert.equal(before.length, 2);

      const success = await clearHistory(storage);
      assert.equal(success, true);

      const after = await getRecentHistory(storage);
      assert.deepEqual(after, []);
    });

    it('Cenário 2 (Edge Case): purgar histórico já vazio retorna verdadeiro sem erros', async () => {
      const storage = createMemoryStorage();
      const success = await clearHistory(storage);
      assert.equal(success, true);
    });

    it('Cenário 3 (Error Path): chamada com storage nulo ou corrompido retorna falso com segurança', async () => {
      const success = await clearHistory(null);
      assert.equal(success, false);

      const history = await getRecentHistory(null);
      assert.deepEqual(history, []);
    });
  });
});
