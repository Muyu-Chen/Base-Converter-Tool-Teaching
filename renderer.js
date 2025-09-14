document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const conversionTypeSelect = document.getElementById('conversion-type');
    const inputNumberEl = document.getElementById('input-number');
    const fromBaseSelect = document.getElementById('from-base');
    const toBaseSelect = document.getElementById('to-base');
    const convertBtn = document.getElementById('convert-btn');
    const explanationResultEl = document.getElementById('explanation-result');
    const integerBasesEl = document.getElementById('integer-bases');

    // Modal Elements
    const conceptsModal = document.getElementById('concepts-modal');
    const showConceptsBtn = document.getElementById('show-concepts-btn');
    const closeBtn = document.querySelector('.modal .close-btn');

    // Theme Elements
    const themeToggle = document.getElementById('theme-toggle');

    // --- Event Listeners ---
    conversionTypeSelect.addEventListener('change', toggleIntegerBases);
    convertBtn.addEventListener('click', performConversion);
    showConceptsBtn.addEventListener('click', () => conceptsModal.style.display = 'block');
    closeBtn.addEventListener('click', () => conceptsModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == conceptsModal) {
            conceptsModal.style.display = 'none';
        }
    });
    themeToggle.addEventListener('change', switchTheme);
    inputNumberEl.addEventListener('input', handleInput);

    // --- Theme Logic ---
    function switchTheme(e) {
        if (e.currentTarget.checked) {
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
        }
    }

    // Apply saved theme on startup
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        themeToggle.checked = true;
        document.body.setAttribute('data-theme', 'light');
    }

    // --- UI Logic ---
    function handleInput(e) {
        const currentType = conversionTypeSelect.value;
        const hasDecimal = e.target.value.includes('.');

        if (currentType === 'integer' && hasDecimal) {
            conversionTypeSelect.value = 'float32';
            // Manually trigger change event to update UI
            conversionTypeSelect.dispatchEvent(new Event('change'));
        }
    }
    explanationResultEl.addEventListener('click', handleExpandClick);

    function handleExpandClick(e) {
        if (e.target.classList.contains('expand-btn')) {
            e.preventDefault();
            const targetId = e.target.getAttribute('data-target');
            const container = document.getElementById(targetId);
            if (container) {
                const isExpanded = container.classList.toggle('expanded');
                e.target.textContent = isExpanded ? '收起详细步骤' : '展开详细步骤';
            }
        }
    }

    function toggleIntegerBases() {
        if (conversionTypeSelect.value === 'integer') {
            integerBasesEl.style.display = 'flex';
        } else {
            integerBasesEl.style.display = 'none';
        }
    }

    function performConversion() {
        const type = conversionTypeSelect.value;
        const numberInput = inputNumberEl.value.trim();

        if (numberInput === '') {
            explanationResultEl.innerHTML = '<p style="color: var(--error-color);">请输入一个数字。</p>';
            return;
        }

        let explanation = '';
        try {
            switch (type) {
                case 'integer':
                    const fromBase = parseInt(fromBaseSelect.value);
                    const toBase = parseInt(toBaseSelect.value);
                    explanation = explainIntegerConversion(numberInput, fromBase, toBase);
                    break;
                case 'float32':
                    explanation = explainFloatConversion(numberInput, 32);
                    break;
                case 'float64':
                    explanation = explainFloatConversion(numberInput, 64);
                    break;
            }
            explanationResultEl.innerHTML = explanation;
        } catch (error) {
            explanationResultEl.innerHTML = `<p style="color: var(--error-color);">转换出错: ${error.message}</p>`;
        }
    }

    // --- Integer Conversion Logic ---
    function explainIntegerConversion(number, fromBase, toBase) {
        // Validate input for the given base
        const validationRegex = new RegExp(`^[0-9A-F]+$`, 'i');
        if (!validationRegex.test(number)) {
            throw new Error('输入的数字包含无效字符。');
        }
        number = number.toUpperCase();
        for (const char of number) {
            const digit = parseInt(char, 16);
            if (digit >= fromBase) {
                throw new Error(`数字 "${number}" 不是一个有效的 ${fromBase} 进制数。`);
            }
        }

        if (fromBase === toBase) {
            return '<p>源进制和目标进制相同，无需转换。</p>';
        }

        // Fast conversions (2, 8, 16)
        if ([2, 8, 16].includes(fromBase) && [2, 8, 16].includes(toBase)) {
            return explainFastConversion(number, fromBase, toBase);
        }

        // Conversion to/from base 10
        if (fromBase === 10) {
            return explainFromDecimal(parseInt(number, 10), toBase);
        } else if (toBase === 10) {
            return explainToDecimal(number, fromBase);
        } else {
            // Convert from source to decimal, then decimal to target
            const toDecimalExplanation = explainToDecimal(number, fromBase);
            const decimalValue = parseInt(number, fromBase);
            const fromDecimalExplanation = explainFromDecimal(decimalValue, toBase);
            return `<h4>第一步：从 ${fromBase} 进制转为 10 进制</h4>${toDecimalExplanation}<h4>第二步：从 10 进制转为 ${toBase} 进制</h4>${fromDecimalExplanation}`;
        }
    }

    function explainToDecimal(number, fromBase) {
        let explanation = `<div class="step"><h4>从 ${fromBase} 进制转为 10 进制</h4><p>通过将每一位乘以其对应的权重（基数的幂）并求和。</p>`;
        let sum = 0;
        let calculation = [];
        const reversedNumber = number.split('').reverse().join('');

        for (let i = 0; i < reversedNumber.length; i++) {
            const digit = parseInt(reversedNumber[i], fromBase);
            const power = fromBase ** i;
            sum += digit * power;
            calculation.push(`(${reversedNumber[i]}<sub>${fromBase}</sub> × ${fromBase}<sup>${i}</sup>)`);
        }

        explanation += `<p>${calculation.join(' + ')} = ${sum}<sub>10</sub></p></div>`;
        explanation += `<div class="final-result">结果: ${number}<sub>${fromBase}</sub> = ${sum}<sub>10</sub></div>`;
        return explanation;
    }

    function explainFromDecimal(number, toBase) {
        if (number === 0) return '<div class="final-result">结果: 0<sub>10</sub> = 0<sub>${toBase}</sub></div>';
        
        let explanation = `<div class="step"><h4>从 10 进制转为 ${toBase} 进制</h4><p>使用“除基取余法”，直到商为0。</p>`;
        let tempNumber = number;
        let remainders = [];

        while (tempNumber > 0) {
            const remainder = tempNumber % toBase;
            const quotient = Math.floor(tempNumber / toBase);
            const remainderChar = remainder.toString(toBase).toUpperCase();
            explanation += `<p>${tempNumber} ÷ ${toBase} = ${quotient} ... <strong>${remainderChar}</strong></p>`;
            remainders.push(remainderChar);
            tempNumber = quotient;
        }

        const result = remainders.reverse().join('');
        explanation += `<p>从下往上读取余数得到结果。</p></div>`;
        explanation += `<div class="final-result">结果: ${number}<sub>10</sub> = ${result}<sub>${toBase}</sub></div>`;
        return explanation;
    }

    function explainFastConversion(number, fromBase, toBase) {
        const toBinary = (num, base) => {
            let bin = '';
            let explanation = `<div class="step"><h4>步骤 1: 转为二进制</h4><p>将每一位 ${base} 进制数转换为等效的二进制数。</p><p class="binary-groups">`;
            const bits = base === 8 ? 3 : 4;
            for (const digit of num) {
                const binaryDigit = parseInt(digit, base).toString(2).padStart(bits, '0');
                explanation += `<span>${binaryDigit}</span>`;
                bin += binaryDigit;
            }
            explanation += '</p></div>';
            return { bin, explanation };
        };

        const fromBinary = (bin, base) => {
            let result = '';
            let explanation = `<div class="step"><h4>步骤 2: 从二进制分组</h4><p>将二进制数从右到左每 ${base === 8 ? 3 : 4} 位一组进行分组。</p><p class="binary-groups">`;
            const bits = base === 8 ? 3 : 4;
            let paddedBin = bin;
            if (bin.length % bits !== 0) {
                paddedBin = bin.padStart(bin.length + (bits - bin.length % bits), '0');
            }
            
            for (let i = 0; i < paddedBin.length; i += bits) {
                const group = paddedBin.substring(i, i + bits);
                const digit = parseInt(group, 2).toString(base).toUpperCase();
                explanation += `<span>${group}</span>`;
                result += digit;
            }
            explanation += '</p></div>';
            return { result, explanation };
        };

        if (fromBase === toBase) return '<p>无需转换。</p>';

        // Direct binary to/from
        if (fromBase === 2) {
            const { result, explanation } = fromBinary(number, toBase);
            return `${explanation}<div class="final-result">结果: ${number}<sub>2</sub> = ${result}<sub>${toBase}</sub></div>`;
        }
        if (toBase === 2) {
            const { bin, explanation } = toBinary(number, fromBase);
            return `${explanation}<div class="final-result">结果: ${number}<sub>${fromBase}</sub> = ${bin.replace(/^0+/, '') || '0'}<sub>2</sub></div>`;
        }

        // Hex <-> Octal (via binary)
        const { bin, explanation: toBinExp } = toBinary(number, fromBase);
        const { result, explanation: fromBinExp } = fromBinary(bin, toBase);
        return `${toBinExp}${fromBinExp}<div class="final-result">结果: ${number}<sub>${fromBase}</sub> = ${result}<sub>${toBase}</sub></div>`;
    }

    // --- Float Conversion Logic ---
    function explainFloatConversion(numberInput, bits) {
        const num = parseFloat(numberInput);
        if (isNaN(num)) {
            throw new Error('无效的浮点数输入。');
        }

        const exponentBits = bits === 32 ? 8 : 11;
        const mantissaBits = bits === 32 ? 23 : 52;
        const bias = 2 ** (exponentBits - 1) - 1;

        let explanation = `<div class="step"><h4>1. 确定符号位</h4>`;
        const sign = num < 0 ? 1 : 0;
        explanation += `<p>数字 ${num} 是${sign === 0 ? '正数' : '负数'}，所以符号位是 <strong>${sign}</strong>。</p></div>`;

        const absNum = Math.abs(num);
        let integerPart = Math.floor(absNum);
        let fractionalPart = absNum - integerPart;

        explanation += `<div class="step"><h4>2. 转换整数部分为二进制</h4>`;
        let integerBinary = integerPart.toString(2);
        explanation += `<p>${integerPart}<sub>10</sub> = <strong>${integerBinary}</strong><sub>2</sub></p></div>`;

        explanation += `<div class="step"><h4>3. 转换小数部分为二进制</h4>`;
        let fractionalBinary = '';
        let tempFraction = fractionalPart;
        let detailSteps = '';
        let stepCount = 0;
        for (let i = 0; i < mantissaBits + 5 && tempFraction > 0; i++) { // Add extra precision
            const currentFraction = tempFraction;
            tempFraction *= 2;
            const bit = Math.floor(tempFraction);
            detailSteps += `<p>${currentFraction.toFixed(4)} × 2 = ${tempFraction.toFixed(4)} → <strong>${bit}</strong></p>`;
            fractionalBinary += bit;
            tempFraction -= bit;
            stepCount++;
        }
        const fractionalString = fractionalPart.toString().split('.')[1] || '';
        explanation += `<p>通过连续乘以 2 并取整数部分，得到二进制小数。</p>`;
        explanation += `<p>0.${fractionalString}<sub>10</sub> ≈ <strong>${fractionalBinary}</strong><sub>2</sub></p>`;
        
        if (stepCount > 3) {
            explanation += `<div id="fractional-details" class="collapsible-container">${detailSteps}</div>`;
            explanation += `<a href="#" class="expand-btn" data-target="fractional-details">展开详细步骤</a>`;
        } else {
            explanation += detailSteps;
        }
        explanation += `</div>`;

        const fullBinary = integerBinary + '.' + fractionalBinary;
        explanation += `<div class="step"><h4>4. 规格化为二进制科学计数法</h4><p>将小数点移动到第一个 '1' 的后面。</p>`;
        explanation += `<p>组合结果: ${fullBinary}</p>`;

        let exponent = 0;
        let mantissa = '';
        if (integerPart > 0) {
            exponent = integerBinary.length - 1;
            mantissa = (integerBinary.substring(1) + fractionalBinary).substring(0, mantissaBits);
        } else {
            const firstOne = fractionalBinary.indexOf('1');
            if (firstOne === -1) { // Number is 0
                exponent = 1 - bias; // Special case for 0
                mantissa = '';
            } else {
                exponent = -(firstOne + 1);
                mantissa = fractionalBinary.substring(firstOne + 1).substring(0, mantissaBits);
            }
        }
        mantissa = mantissa.padEnd(mantissaBits, '0');
        explanation += `<p>规格化: 1.${mantissa} × 2<sup>${exponent}</sup></p></div>`;

        explanation += `<div class="step"><h4>5. 计算偏移后的指数</h4>`;
        const biasedExponent = exponent + bias;
        explanation += `<p>实际指数 = ${exponent}</p>`;
        explanation += `<p>偏移量 (${bits}位) = ${bias}</p>`;
        explanation += `<p>存储的指数 = ${exponent} + ${bias} = ${biasedExponent}</p>`;
        const exponentBinary = biasedExponent.toString(2).padStart(exponentBits, '0');
        explanation += `<p>${biasedExponent}<sub>10</sub> = <strong>${exponentBinary}</strong><sub>2</sub></p></div>`;

        explanation += `<div class="step"><h4>6. 提取尾数</h4><p>尾数是科学计数法中小数点后的部分，共 ${mantissaBits} 位。</p><p><em>注：根据 IEEE 754 标准，规格化后小数点前的 1 是隐藏的（也称隐含位），无需存储，这能有效节省一位空间以提高精度。</em></p>`;
        explanation += `<p><strong>${mantissa}</strong></p></div>`;

        const finalBinary = `${sign} ${exponentBinary} ${mantissa}`;
        explanation += `<div class="final-result"><h4>最终 ${bits}-bit 结果</h4><p>${finalBinary.replace(/ /g, ' | ')}</p></div>`;

        return explanation;
    }
});