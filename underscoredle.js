(() => {
  const string = document.getElementById('underscores');
  const form = document.getElementById('guess-form');
  const input = document.getElementById('guess');
  const feedback = document.getElementById('feedback');
  const check = document.getElementById('check');
  const helpDialog = document.getElementById('how-to-play');
  document.getElementById('help-button').addEventListener('click', () => {
    helpDialog.showModal();
  });
  let count;
  let attempts = 0;
  function newRound() {
    attempts = 0;
    count = Math.floor(Math.random() * 30) + 1;
    string.textContent = '_'.repeat(count);
    input.value = '';
    input.disabled = false;
    check.disabled = false;
    window.i18n.set(feedback, 'Take your time. Every underscore counts.');
    delete feedback.dataset.result;
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const guess = Number(input.value);
    attempts++;
    if (guess === count) {
      window.i18n.set(feedback, 'Round complete!');
      feedback.dataset.result = 'correct';
      input.disabled = true;
      check.disabled = true;
      window.showResults(`Correct! Answer: ${count} underscores. Guesses: ${attempts}.`);
    } else {
      window.i18n.set(feedback, guess < count ? 'Too low. Count again and try a higher number.' : 'Too high. Count again and try a lower number.');
      feedback.dataset.result = 'incorrect';
      input.focus();
      input.select();
    }
  });
  document.getElementById('new-round').addEventListener('click', () => {
    newRound();
    input.focus();
  });
  newRound();
})();
