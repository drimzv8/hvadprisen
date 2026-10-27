/*
  Keeps the guess input in Danish price format while typing:
  digits and one decimal comma with at most 2 decimals (e.g. 9,97).
  A typed "." counts as the decimal comma, so 9.97 works too.
*/

const priceInput = document.querySelector("input[data-type='currency']");

priceInput.addEventListener("input", () => {
  const formatted = formatPriceInput(priceInput.value);
  //Only rewrite when needed, so the caret doesn't jump while typing
  if (formatted !== priceInput.value) {
    priceInput.value = formatted;
  }
});

//On blur, always show two decimals: 9 -> 9,00 and 9,9 -> 9,90
priceInput.addEventListener("blur", () => {
  const formatted = formatPriceInput(priceInput.value);
  if (!formatted) {
    return;
  }
  const [kroner, ore = ""] = formatted.split(",");
  priceInput.value = `${kroner || "0"},${ore.padEnd(2, "0")}`;
});

function formatPriceInput(value) {
  const cleaned = value.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [kroner, ...decimals] = cleaned.split(",");

  if (decimals.length === 0) {
    return kroner;
  }
  return `${kroner},${decimals.join("").slice(0, 2)}`;
}
