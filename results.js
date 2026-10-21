(() => {
  const dialog = document.getElementById('results-dialog');
  document.getElementById('results-replay').addEventListener('click', () => {
    dialog.close();
    document.getElementById('new-round')?.click();
    document.getElementById('reset-tissue')?.click();
  });
  window.showResults = (text) => {
    window.i18n.set(document.getElementById('results-data'), text);
    if (!dialog.open) dialog.showModal();
  };
})();
