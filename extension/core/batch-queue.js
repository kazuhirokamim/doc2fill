// core/batch-queue.js
// Gerenciador de Fila de Lote (Batch Queue) em Memória Volátil (Zero Retenção)

export class BatchQueueManager {
  constructor() {
    this.items = [];
    this.currentIndex = 0;
  }

  addFiles(fileList) {
    if (!fileList || !Array.isArray(fileList)) return 0;
    let addedCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (!f || typeof f !== 'object') continue;
      if (Object.keys(f).length === 0 && !(f instanceof (globalThis.File || Object))) continue;
      if (Object.keys(f).length === 0 && typeof f.name === 'undefined') continue;
      const fileName = f.name || f.fileName || (typeof f === 'string' ? f : `documento_${this.items.length + 1}.pdf`);
      
      const item = {
        id: `batch_${Date.now()}_${this.items.length}_${Math.random().toString(36).slice(2, 7)}`,
        fileName,
        rawFile: f,
        status: 'pending',
        data: null,
        error: null,
        enqueuedAt: Date.now()
      };

      this.items.push(item);
      addedCount++;
    }

    return addedCount;
  }

  async processAll(processorFn) {
    if (!this.items.length || typeof processorFn !== 'function') return [];

    const promises = this.items.map(async (item) => {
      item.status = 'processing';
      try {
        const result = await processorFn(item.rawFile);
        item.status = 'ready';
        item.data = result;
        return result;
      } catch (err) {
        item.status = 'error';
        item.error = err?.message || String(err);
        throw err;
      }
    });

    const settled = await Promise.allSettled(promises);
    return settled;
  }

  size() {
    return this.items.length;
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  getCurrentItem() {
    if (this.currentIndex >= 0 && this.currentIndex < this.items.length) {
      return this.items[this.currentIndex];
    }
    return null;
  }

  getItemAt(index) {
    if (index >= 0 && index < this.items.length) {
      return this.items[index];
    }
    return null;
  }

  next() {
    if (!this.items.length) return null;
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
    }
    return this.getCurrentItem();
  }

  prev() {
    if (!this.items.length) return null;
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
    return this.getCurrentItem();
  }

  goTo(index) {
    if (typeof index !== 'number' || index < 0 || index >= this.items.length) {
      return false;
    }
    this.currentIndex = index;
    return true;
  }

  markCurrentAsFilled() {
    const item = this.getCurrentItem();
    if (item) {
      item.status = 'filled';
      return true;
    }
    return false;
  }

  clear() {
    this.items = [];
    this.currentIndex = 0;
  }

  getSummary() {
    let pending = 0;
    let processing = 0;
    let ready = 0;
    let filled = 0;
    let error = 0;

    for (const it of this.items) {
      if (it.status === 'ready') ready++;
      else if (it.status === 'filled') filled++;
      else if (it.status === 'error') error++;
      else if (it.status === 'processing') processing++;
      else pending++;
    }

    return {
      total: this.items.length,
      currentIndex: this.currentIndex,
      pending,
      processing,
      ready,
      filled,
      error
    };
  }
}
