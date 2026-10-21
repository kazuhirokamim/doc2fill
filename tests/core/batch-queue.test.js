// @tear-proof issue-1
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BatchQueueManager } from '../../core/batch-queue.js';

describe('doc2fill Sprint A: Batch Queue Manager (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): enfileira múltiplos documentos, processa concorrentemente, navega e atualiza status', async () => {
    const queue = new BatchQueueManager();

    const mockFiles = [
      { name: 'danfe_01.pdf', text: 'CNPJ: 11.222.333/0001-44\nValor: R$ 150,00' },
      { name: 'recibo_02.pdf', text: 'CNPJ: 22.333.444/0001-55\nValor: R$ 320,00' },
      { name: 'cupom_03.png', text: 'CNPJ: 33.444.555/0001-66\nValor: R$ 45,90' }
    ];

    queue.addFiles(mockFiles);
    assert.equal(queue.size(), 3);
    assert.equal(queue.getCurrentIndex(), 0);

    // Processador simulado com Promise.allSettled
    const processor = async (file) => {
      return {
        cnpj: file.text.match(/CNPJ:\s*([\d\.\/\-]+)/)[1],
        valor: file.text.match(/Valor:\s*(R\$\s*[\d,\.]+)/)[1]
      };
    };

    const results = await queue.processAll(processor);
    assert.equal(results.length, 3);
    assert.equal(queue.getSummary().ready, 3);

    // Valida dados do primeiro documento
    const item0 = queue.getCurrentItem();
    assert.equal(item0.fileName, 'danfe_01.pdf');
    assert.equal(item0.status, 'ready');
    assert.equal(item0.data.cnpj, '11.222.333/0001-44');

    // Marca como preenchido e avança
    queue.markCurrentAsFilled();
    assert.equal(queue.getCurrentItem().status, 'filled');

    const nextItem = queue.next();
    assert.equal(queue.getCurrentIndex(), 1);
    assert.equal(nextItem.fileName, 'recibo_02.pdf');
    assert.equal(nextItem.data.cnpj, '22.333.444/0001-55');

    // Volta para o anterior
    const prevItem = queue.prev();
    assert.equal(queue.getCurrentIndex(), 0);
    assert.equal(prevItem.fileName, 'danfe_01.pdf');
  });

  it('Cenário 2 (Edge Case): resiliência contra falhas parciais (1 falha entre válidos) sem travar a fila', async () => {
    const queue = new BatchQueueManager();

    const mockFiles = [
      { name: 'valido_01.pdf', valid: true },
      { name: 'corrompido_02.pdf', valid: false },
      { name: 'valido_03.pdf', valid: true }
    ];

    queue.addFiles(mockFiles);

    const flakyProcessor = async (file) => {
      if (!file.valid) throw new Error('PDF stream corrompido');
      return { status: 'sucesso', file: file.name };
    };

    await queue.processAll(flakyProcessor);
    const summary = queue.getSummary();

    assert.equal(summary.total, 3);
    assert.equal(summary.ready, 2);
    assert.equal(summary.error, 1);

    // Item 1 deve conter o erro isolado
    const item1 = queue.getItemAt(1);
    assert.equal(item1.status, 'error');
    assert.ok(item1.error.includes('PDF stream corrompido'));

    // Itens 0 e 2 devem estar prontos
    assert.equal(queue.getItemAt(0).status, 'ready');
    assert.equal(queue.getItemAt(2).status, 'ready');
  });

  it('Cenário 3 (Error Path): chamadas defensivas com fila vazia, limites ultrapassados ou entradas inválidas', async () => {
    const queue = new BatchQueueManager();

    // Com fila vazia
    assert.equal(queue.size(), 0);
    assert.equal(queue.getCurrentItem(), null);
    assert.equal(queue.next(), null);
    assert.equal(queue.prev(), null);
    assert.equal(queue.goTo(10), false);

    // Adiciona entradas nulas/inválidas com segurança
    queue.addFiles(null);
    queue.addFiles([null, undefined, {}]);
    assert.equal(queue.size(), 0);

    // ProcessAll em fila vazia não quebra
    const res = await queue.processAll(async () => {});
    assert.deepEqual(res, []);
  });
});
