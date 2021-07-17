let x_data = []; // Мощности турбины из таблицы.
let y_data = []; // Напоры из таблицы.
let z_data = []; // КПД турбины из таблицы.
let states = []; // Состояния гидроагрегата в некоторый момент времени.

states.add = function (state) {
    states.unshift(state);
    if (states.length === 37) {
        states.pop();
    }
}

function State(gPower, pressure) {
    this.pressure = pressure; // Напор.
    this.gPower = gPower; // Мощность генератора.
    this.gEfficiency = 0.98; // КПД генератора.
    this.tPower = undefined; // Мощность турбины.
    this.tEfficiency = undefined; // КПД турбины.
}

// Определяем КПД турбины методом обратных взвешенных расстояний.
function calcZ(x, y) {
    function bSearchIndices(value, arr) {
        let minIdx;
        let maxIdx;
        let dv = (arr[1] - arr[0]) / 15;
        function bSearchRecurs(leftIdx, rightIdx) {
            if (rightIdx - leftIdx > 1) {
                let middleIdx = leftIdx + ((rightIdx - leftIdx) >> 1);
                if (value <= arr[middleIdx]) {
                    bSearchRecurs(leftIdx, middleIdx);
                }
                else {
                    bSearchRecurs(middleIdx, rightIdx);
                }
            }
            else {
                if (value < arr[leftIdx] + dv) {
                    minIdx = leftIdx;
                    maxIdx = leftIdx;
                }
                else if (value > arr[rightIdx] - dv) {
                    minIdx = rightIdx;
                    maxIdx = rightIdx;
                }
                else {
                    minIdx = leftIdx;
                    maxIdx = rightIdx;
                }
            }
        }

        bSearchRecurs(0, arr.length - 1);
        return [minIdx, maxIdx];
    }

    function computeHypotenuse(x, y) {
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    }

    function computeWeights(distances) {
        let weights = [];
        for (let i = 0; i < distances.length; i++) {
            weights.push(Math.pow(distances[i], -1.5));
        }
        return weights;
    }

    function computeZ(weights, zs) {
        let z = 0;
        let sumWeight = 0;
        for (let i = 0; i < weights.length; i++) {
            z += weights[i] * zs[i];
            sumWeight += weights[i];
        }
        return z / sumWeight;
    }

    let z;
    // Индексы ближайших опорных точек.
    let [xMinIdx, xMaxIdx] = bSearchIndices(x, x_data);
    let [yMinIdx, yMaxIdx] = bSearchIndices(y, y_data);
    // Значения ближайших опорных точек.
    let xMin = x_data[xMinIdx];
    let xMax = x_data[xMaxIdx];
    let yMin = y_data[yMinIdx];
    let yMax = y_data[yMaxIdx];

    let hx = x_data[1] - x_data[0];
    let hy = y_data[1] - y_data[0];
    // Катеты, используемые для рассчета гипотенуз (расстояний до опорных точек).
    let xDown = (x - xMin) * hy;
    let xUp = (xMax - x) * hy;
    let yDown = (y - yMin) * hx;
    let yUp = (yMax - y) * hx;

    let distances = []; // Расстояния до опорных точек.
    let zs = []; // Значения опорных точек.

    if ((xMin === xMax) && (yMin === yMax)) {
        // Совпало с опорной точкой.
        z = z_data[yMinIdx][xMinIdx];
    }
    else {
        if (xMin === xMax) {
            // Между 2-мя вертикальными опорными точками.
            zs.push(z_data[yMinIdx][xMinIdx]);
            zs.push(z_data[yMaxIdx][xMinIdx]);
            distances.push(yDown);
            distances.push(yUp);
        }
        else if (yMin === yMax) {
            // Между 2-мя горизонтальными опорными точками.
            zs.push(z_data[yMinIdx][xMinIdx]);
            zs.push(z_data[yMinIdx][xMaxIdx]);
            distances.push(xDown);
            distances.push(xUp);
        }
        else {
            // Между 4-мя опорными точками.
            zs.push(z_data[yMinIdx][xMinIdx]);
            zs.push(z_data[yMaxIdx][xMinIdx]);
            zs.push(z_data[yMaxIdx][xMaxIdx]);
            zs.push(z_data[yMinIdx][xMaxIdx]);
            distances.push(computeHypotenuse(xDown, yDown));
            distances.push(computeHypotenuse(xDown, yUp));
            distances.push(computeHypotenuse(xUp, yUp));
            distances.push(computeHypotenuse(xUp, yDown));
        }
        z = computeZ(computeWeights(distances), zs);
    }

    return z;
}

// Формируем текущее состояние гидроагрегата.
function getCurrState(x, y) {
    // Получаем входные данные от контроллера. 
    let gPower = (x ? x : Math.random() * (x_data[x_data.length - 1] - x_data[0]) + x_data[0]) * 0.98;
    let pressure = y ? y : Math.random() * (y_data[y_data.length - 1] - y_data[0]) + y_data[0];

    let state = new State(gPower, pressure);
    state.tPower = state.gPower / state.gEfficiency;
    state.tEfficiency = calcZ(state.tPower, state.pressure);
    return state;
}

// Колбэк-функция для "Papa.parse()".
function initXYZ(results) {
    function getFloat(string) {
        return Number.parseFloat(string.replace(',', '.'));
    }

    // Инициализируем массив x_data.
    for (let i = 1; i < results.data[0].length; i++) {
        x_data.push(getFloat(results.data[0][i]));
    }
    // Инициализируем массив y_data.
    for (let i = 1; i < results.data.length; i++) {
        y_data.push(getFloat(results.data[i][0]));
    }
    // Инициализируем массив z_data.
    for (let i = 1; i < results.data.length; i++) {
        let arr = [];
        for (let j = 1; j < results.data[i].length; j++) {
            arr.push(getFloat(results.data[i][j]));
        }
        z_data.push(arr);
    }
}

function drawGraph() {
    let rgb = 190;
    let surface = {
        x: x_data,
        y: y_data,
        z: z_data,
        colorscale: [
            ['0.0', `rgb(${rgb},0,0)`],
            ['0.01', `rgb(${rgb},${rgb},0)`],
            ['1.0', `rgb(0,${rgb},0)`]
        ],
        showscale: false,
        opacity: 0.9,
        name: '',
        type: 'surface'
    }
    let data = [surface];

    if (states.length !== 0) {
        let xs = [];
        let ys = [];
        let zs = [];
        let colores = [];
        let texts = [];
        rgb = 3;
        for (let i = 0; i < states.length; i++) {
            xs.push(states[i].tPower);
            ys.push(states[i].pressure);
            zs.push(states[i].tEfficiency);
            rgb += 7;
            colores.push(`rgb(${rgb}, ${rgb}, ${rgb})`);
            texts.push(`Состояние ${i + 1}`);
        }

        let marker = {
            x: xs,
            y: ys,
            z: zs,
            mode: 'markers',
            marker: {
                size: 12,
                symbol: 'circle',
                line: {
                    color: 'rgb(204, 204, 204)',
                    width: 1
                },
                color: colores
            },
            name: '',
            text: texts,
            type: 'scatter3d'
        };
        data.push(marker);
    }

    let layout = {
        //title: "Эксплуатационная характеристика турбины",
        scene: {
            xaxis: {
                title: 'X - Мощность турбины, МВт',
                dtick: x_data[1] - x_data[0],
                ticks: "outside"
            },
            yaxis: {
                title: 'Y - Напор, м',
                dtick: y_data[1] - y_data[0],
                ticks: "outside"
            },
            zaxis: {
                title: 'Z - КПД турбины, %',
                ticks: "outside"
            }
        },
        height: window.innerHeight,
        margin: {
            l: 0,
            r: 0,
            t: 0,
            b: 0
        }
    };

    if (states.length === 0) {
        Plotly.newPlot('graph', data, layout, { displayModeBar: false });
    }
    else {
        Plotly.react('graph', data, layout, { displayModeBar: false });
    }
}

Papa.parse('../data/operational-characteristic.csv', {
    download: true,
    skipEmptyLines: 'greedy',
    complete: (results) => {
        initXYZ(results);
        states.add(getCurrState());
        drawGraph();
    }
});
let intervalID = setInterval(() => {
    states.add(getCurrState());
    drawGraph();
    if (states.length === 36) {
        clearInterval(intervalID);
    }
}, 100);