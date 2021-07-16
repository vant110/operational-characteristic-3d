let x_data; // Массив мощностей турбины.
let y_data; // Массив напоров.
let z_data; // Массив КПД турбины.
let states = []; // Массив состояний гидроагрегата в некоторый момент времени.

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
    function computeZ(weights, zs) {
        let z = 0;
        let sumWeight = 0;
        for (let i = 0; i < weights.length; i++) {
            z += weights[i] * zs[i];
            sumWeight += weights[i];
        }
        return z / sumWeight;
    }

    function computeWeights(distances) {
        let weights = [];
        for (let i = 0; i < distances.length; i++) {
            weights.push(1 / distances[i]);
        }
        return weights;
    }

    function computeHypotenuse(x, y) {
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    }

    let z;   
    // Значения ближайших опорных точек.
    let xMin;
    let xMax;
    let yMin;
    let yMax;
    // Индексы ближайших опорных точек.
    let xMinIdx;
    let xMaxIdx;
    let yMinIdx;
    let yMaxIdx;

    // Находим xMin и xMax.
    let hx = x_data[1] - x_data[0];
    let dx = hx / 100;
    for (let i = 0; i < x_data.length - 1; i++) {
        if (x <= x_data[i + 1]) {
            if (x < x_data[i] + dx) {
                xMinIdx = i;
                xMaxIdx = i;
            }
            else if (x > x_data[i + 1] - dx) {
                xMinIdx = i + 1;
                xMaxIdx = i + 1;
            }
            else {
                xMinIdx = i;
                xMaxIdx = i + 1;
            }
            xMin = x_data[xMinIdx];
            xMax = x_data[xMaxIdx];
            break;
        }
    }
    // Находим yMin и yMax.
    let hy = y_data[1] - y_data[0];
    let dy = hy / 100;
    for (let i = 0; i < y_data.length - 1; i++) {
        if (y <= y_data[i + 1]) {
            if (y < y_data[i] + dy) {
                yMinIdx = i;
                yMaxIdx = i;
            }
            else if (y > y_data[i + 1] - dy) {
                yMinIdx = i + 1;
                yMaxIdx = i + 1;
            }
            else {
                yMinIdx = i;
                yMaxIdx = i + 1;
            }
            yMin = y_data[yMinIdx];
            yMax = y_data[yMaxIdx];
            break;
        }
    }

    // Катеты, используемые для рассчета гипотенуз (расстояний до опорных точек).
    let xDown = x - xMin;
    let xUp = xMax - x;
    let yDown = y - yMin;
    let yUp = yMax - y;

    let distances = []; // Расстояния до опорных точек.
    let zs = []; // Значения опорных точек.

    if ((xMin === xMax) && (yMin === yMax)) {
        // Совпало с опорной точкой.
        z = z_data[yMinIdx][xMinIdx];
    }
    else {
        if (xMin === xMax) {
            if ((xMin === x_data[0]) || (xMin === x_data[x_data.length - 1])) {
                // Между 2-мя вертикальными опорными точками на границе.            
                zs.push(z_data[yMinIdx][xMinIdx]);
                zs.push(z_data[yMaxIdx][xMinIdx]);
                distances.push(yDown);
                distances.push(yUp);
            }
            else {
                // Между 2-мя вертикальными опорными точками НЕ на границе.
                zs.push(z_data[yMinIdx][xMinIdx - 1]);
                zs.push(z_data[yMaxIdx][xMinIdx - 1]);
                zs.push(z_data[yMaxIdx][xMinIdx + 1]);
                zs.push(z_data[yMinIdx][xMinIdx + 1]);
                distances.push(computeHypotenuse(hx, yDown));
                distances.push(computeHypotenuse(hx, yUp));
                distances.push(distances[1]);
                distances.push(distances[0]);
            }
        }
        else if (yMin === yMax) {
            if ((yMin === y_data[0]) || (yMin === y_data[y_data.length - 1])) {
                // Между 2-мя горизонтальными опорными точками на границе.
                zs.push(z_data[yMinIdx][xMinIdx]);
                zs.push(z_data[yMinIdx][xMaxIdx]);
                distances.push(xDown);
                distances.push(xUp);
            }
            else {
                // Между 2-мя горизонтальными опорными точками НЕ на границе.
                zs.push(z_data[yMinIdx - 1][xMinIdx]);
                zs.push(z_data[yMinIdx + 1][xMinIdx]);
                zs.push(z_data[yMinIdx + 1][xMaxIdx]);
                zs.push(z_data[yMinIdx - 1][xMaxIdx]);
                distances.push(computeHypotenuse(xDown, hy));
                distances.push(distances[0]);
                distances.push(computeHypotenuse(xUp, hy));
                distances.push(distances[2]);
            }
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
function getCurrState() {  
    // Получаем входные данные от контроллера.  
    let gPower = Math.random() * (x_data[x_data.length - 1] - x_data[0]) + x_data[0];
    let pressure = Math.random() * (y_data[y_data.length - 1] - y_data[0]) + y_data[0];

    let state = new State(gPower, pressure);    
    state.tPower = state.gPower / state.gEfficiency;
    state.tEfficiency = calcZ(state.tPower, state.pressure);
    return state;
}

// Колбэк-функция для "Plotly.d3.csv()".
function initXYZ(rows) {
    function getX_data(rows) {
        let x_data = [];
        for (let prop in rows[0]) {
            let x = Number.parseInt(prop);
            if (!Number.isNaN(x)) {
                x_data.push(x);
            }
        }
        return x_data;
    }

    function getY_data(rows) {
        let y_data = [];
        for (let obj of rows) {
            let y = Number.parseInt(obj[""]);
            y_data.push(y);
        }
        return y_data;
    }

    function getZ_data(rows, x_data) {
        let z_data = [];
        for (let obj of rows) {
            let arr = [];
            for (let x of x_data) {
                arr.push(obj[x]);
            }
            z_data.push(arr);
        }
        return z_data;
    }

    x_data = getX_data(rows);
    y_data = getY_data(rows);
    z_data = getZ_data(rows, x_data);
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
        opacity: 0.9,
        name: 'Поверхность',
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
        title: "Эксплуатационная характеристика турбины",
        scene: {
            xaxis: {
                title: 'X - Мощность турбины, МВт',
                dtick: x_data[1] - x_data[0]
            },
            yaxis: {
                title: 'Y - Напор, м',
                dtick: y_data[1] - y_data[0]
            },
            zaxis: {
                title: 'Z - КПД турбины, %'
            },
        },
        height: 880
    };

    if (states.length === 0) {
        Plotly.newPlot('graph', data, layout, { displayModeBar: false });
    }
    else {
        Plotly.react('graph', data, layout, { displayModeBar: false });
    }
}

Plotly.d3.csv('data/operational-characteristic.csv', initXYZ);
setTimeout(() => {
    states.add(getCurrState());
    drawGraph();    
}, 0);
let intervalID = setInterval(() => {
    states.add(getCurrState());
    drawGraph();
    if (states.length === 36) {
        clearInterval(intervalID);
    }
}, 100);