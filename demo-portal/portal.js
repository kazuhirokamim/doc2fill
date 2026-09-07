// doc2fill — Controlador de Simulação do Portal Governamental (AGU/PGFN)
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('nota-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      alert('Nota submetida com sucesso no simulador!');
    });
  }
});
