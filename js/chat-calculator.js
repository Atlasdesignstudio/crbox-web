/**
 * chat-calculator.js
 * Renders an inline mini-calculator card inside a chat message.
 * Reuses calculator-engine.js math (must be loaded first).
 */
(function (global) {
  'use strict';

  var SIMPLE_CATEGORIES = [
    { value: 'celulares',           label: 'Celular / Tablet' },
    { value: 'computadora',         label: 'Computadora / Laptop' },
    { value: 'televisor',           label: 'Televisor' },
    { value: 'consola_videojuegos', label: 'Consola de videojuegos' },
    { value: 'auricular_telefono',  label: 'Auriculares / Bocina' },
    { value: 'ropa',                label: 'Ropa / Zapatos' },
    { value: 'juguetes',            label: 'Juguetes' },
    { value: 'herramientas',        label: 'Herramientas' },
    { value: 'electrodomesticos',   label: 'Electrodoméstico' },
    { value: 'camara',              label: 'Cámara / Fotografía' },
    { value: 'libros',              label: 'Libros' },
    { value: 'otros',               label: 'Otro' },
  ];

  function createCalcWidget(initialWeight, initialCategory) {
    var container = document.createElement('div');
    container.className = 'crbox-widget-calc';

    var title = document.createElement('div');
    title.className = 'crbox-widget-title';
    title.innerHTML = '<i class="fas fa-calculator"></i> Calculadora de Envío';
    container.appendChild(title);

    // Weight input
    var rowWeight = document.createElement('div');
    rowWeight.className = 'crbox-widget-row';
    var lblW = document.createElement('label');
    lblW.className = 'crbox-widget-label';
    lblW.textContent = 'Peso (kg)';
    var inpW = document.createElement('input');
    inpW.type = 'number';
    inpW.min = '0.1';
    inpW.step = '0.1';
    inpW.className = 'crbox-widget-input';
    inpW.placeholder = 'Ej: 1.5';
    inpW.value = initialWeight || '';
    rowWeight.appendChild(lblW);
    rowWeight.appendChild(inpW);
    container.appendChild(rowWeight);

    // Category select
    var rowCat = document.createElement('div');
    rowCat.className = 'crbox-widget-row';
    var lblC = document.createElement('label');
    lblC.className = 'crbox-widget-label';
    lblC.textContent = 'Categoría';
    var selC = document.createElement('select');
    selC.className = 'crbox-widget-select';
    SIMPLE_CATEGORIES.forEach(function (cat) {
      var opt = document.createElement('option');
      opt.value = cat.value;
      opt.textContent = cat.label;
      if (cat.value === (initialCategory || 'otros')) opt.selected = true;
      selC.appendChild(opt);
    });
    rowCat.appendChild(lblC);
    rowCat.appendChild(selC);
    container.appendChild(rowCat);

    // Declared value
    var rowVal = document.createElement('div');
    rowVal.className = 'crbox-widget-row';
    var lblV = document.createElement('label');
    lblV.className = 'crbox-widget-label';
    lblV.textContent = 'Valor declarado (USD)';
    var inpV = document.createElement('input');
    inpV.type = 'number';
    inpV.min = '1';
    inpV.step = '1';
    inpV.className = 'crbox-widget-input';
    inpV.placeholder = 'Ej: 50';
    rowVal.appendChild(lblV);
    rowVal.appendChild(inpV);
    container.appendChild(rowVal);

    // Result area
    var resultDiv = document.createElement('div');
    resultDiv.className = 'crbox-widget-result';
    resultDiv.style.display = 'none';
    container.appendChild(resultDiv);

    // Link to full calculator
    var link = document.createElement('a');
    link.href = 'calculadora.html';
    link.className = 'crbox-calc-link';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Calculadora completa →';
    container.appendChild(link);

    function recalc() {
      var weight = parseFloat(inpW.value) || 0;
      var value  = parseFloat(inpV.value) || 0;
      var cat    = selC.value;
      if (weight <= 0) { resultDiv.style.display = 'none'; return; }
      if (!global.CALCULATOR_ENGINE) return;
      try {
        var result = CALCULATOR_ENGINE.calcSinglePackage({
          weight: weight, value: value, category: cat, destination: 'sanjose'
        });
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = 'Estimado: <span>$' + result.total.toFixed(2) + '</span>';
      } catch (e) {
        resultDiv.style.display = 'none';
      }
    }

    inpW.addEventListener('input', recalc);
    inpV.addEventListener('input', recalc);
    selC.addEventListener('change', recalc);

    if (initialWeight) setTimeout(recalc, 50);

    return container;
  }

  global.CHAT_CALCULATOR = { createCalcWidget: createCalcWidget };
})(window);
