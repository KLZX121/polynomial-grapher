const polynomial = {
    stringify: (degree, coefficients = null) => {
        /*
        Stringify a polynomial of given parameters
        Optionally add array of coefficients: coefficients = [a, b,..., c, d]
        Returns in the form y = ax^n + bx^(n-1) ... + cx + d
        */
        if (coefficients && (coefficients.length !== (degree + 1))) return null;

        if (!coefficients){
            coefficients = Array(degree + 1).fill(1);
            coefficients[coefficients.length - 1] = 0;
        }

        let polyString = `y=`;

        coefficients.forEach((cf, i) => {
            let deg = degree - i;
            let xTerm = `${!deg ? '' : 'x'}${!deg ? '' : deg === 1 ? '' : `^${deg}`}`;

            switch (cf) {
                case 0:
                    return;

                case 1:
                case -1:
                    polyString += `${cf === -1 ? '-' : (polyString.length > 2) ? '+' : ''}` + (xTerm || '1');
                    break;

                default:
                    polyString += `${(polyString.length > 2) ? (cf > 0 ? '+' : '') : ''}${cf}` + xTerm;
                    break;
            }
        });

        return polyString;
    },
    parse: polyStr => {
        /*
        HAS NO ERROR HANDLING
        Parses a stringified polynomial
        Returns degree and coefficients
        */
        let coefficients = polyStr.slice(2);
        coefficients = coefficients.replace(/-/g, '+-');
        coefficients = coefficients.split('+');
        coefficients = coefficients.filter(x => x);

        let degree = parseInt(coefficients[0].slice(coefficients[0].indexOf('^') + 1));

        //Add 0s into missing coefficients e.g. y=x^3+1 would be equal to y=x^3+0x^2+0x+1
        if (coefficients.length !== (degree + 1)){
            for (let i = 0; i < (degree + 1); i++){
                let term = coefficients[i];
                let exponent;
                if (term?.includes('^')){
                    exponent = parseFloat(term.slice(term.indexOf('^') + 1));
                } else if (term?.includes('x')){
                    exponent = 1;
                } else {
                    exponent = 0;
                }

                if (exponent !== (degree - i) || (!exponent && coefficients.length === degree)) coefficients.splice(i, 0, 0);
            }
        }

        coefficients.forEach((term, index) => {
            if (isNaN(term) && term.includes('x')){
                coefficients[index] = coefficients[index].slice(0, term.indexOf('x')) || 1;
            }
            if (coefficients[index] === '-') coefficients[index] = -1;
            coefficients[index] = parseFloat(coefficients[index]);
        });

        return { degree, coefficients };
    },
    evaluate: (polyStr, xVal) => {
        /*
        Evaluates the value of a polynomial at a given xVal
        */
        const {degree, coefficients} = polynomial.parse(polyStr);
        if (coefficients.length !== (degree + 1)) return null;

        let yVal = 0;

        for (let i = 0; i < coefficients.length; i++) {
            let cf = coefficients[i];
            let deg = degree - i;
            
            yVal += (xVal ** deg) * cf;
        }

        return yVal;
    },
    plot: (polyStr, domain = [-10, 10], step = 1) => {
        /*
        degree = Int, coefficients = FloatArray, domain = FloatArray, step = Float
        domain = [xMin, xMax], xMax > xMin
        Computes points given polynomial, with uniform dx (step)
        Returns array of points [[x1, y1],...,[xn, yn]]
        */
        const {degree, coefficients} = polynomial.parse(polyStr);
        const [xMin, xMax] = domain;

        if (coefficients.length !== (degree + 1)) return null;
        if (xMax <= xMin) return null;

        let points = Array();

        let dc = getDecimalPlaces(step);

        for (let xVal = xMin; xVal <= xMax; xVal += step) {
            xVal = Math.round((xVal + Number.EPSILON) * (10**dc)) / (10**dc);
            let yVal = polynomial.evaluate(polyStr, xVal);
            points.push([xVal, yVal]);
        }

        return points;
    },
    derivative: polyStr => {
        /*
        Computes derivative of polynomial
        Returns stringified derivative
        */
        const {degree, coefficients} = polynomial.parse(polyStr);
        if (coefficients.length !== (degree + 1)) return null;

        let derCf = [];

        coefficients.forEach((cf, index) => {
            derCf[index] = (degree - index) * cf;
        });

        derCf.splice(-1, 1);

        return polynomial.stringify(degree - 1, derCf);
    },
    smartPlot: (polyStr, {domain = [-10, 10], sampleRate = 0.1, precision = 0.5} = {}) => {
        /*
        sampleRate = x step (smaller for better accuracy)
        precision = difference of gradient for value to count (smaller for denser graphing)
        Calculate an optimal set of points for graphing
        Returns array of points
        */
        const {degree, coefficients} = polynomial.parse(polyStr);
        if (coefficients.length !== (degree + 1)) return null;

        const [xMin, xMax] = domain;
        const derivativeStr = polynomial.derivative(polyStr);

        let points = [[xMin, polynomial.evaluate(polyStr, xMin)]];
        let pointsM = [polynomial.evaluate(derivativeStr, xMin)]

        let dc = getDecimalPlaces(sampleRate);

        let i = 0;
        for (let xVal = xMin; xVal <= xMax; xVal += sampleRate) {
            xVal = Math.round((xVal + Number.EPSILON) * (10**dc)) / (10**dc);

            let m = polynomial.evaluate(derivativeStr, xVal); 

            if (Math.abs(m - pointsM[pointsM.length - 1]) >= precision){
                points.push([xVal, polynomial.evaluate(polyStr, xVal)]);
                pointsM.push(polynomial.evaluate(derivativeStr, xVal));
            }
            i++;
        }

        return points;
    }
}
function getDecimalPlaces(value){
    if (value % 1){
        return value.toString().split('.')[1].length || 0;
    } else {
        return 0;
    }
}

const g = document.getElementById.bind(document);

const axesCanvas = g('axesCanvas');
const aCtx = axesCanvas.getContext('2d');

const pointsCanvas = g('pointsCanvas');
const pCtx = pointsCanvas.getContext('2d');

const graphCanvas = g('graphCanvas');
const gCtx = graphCanvas.getContext('2d');

const labelsCanvas = g('labelsCanvas');
const lCtx = labelsCanvas.getContext('2d');
lCtx.font = '10px monospace';

const colours = {
    values: ['red', 'blue', 'green', 'orange', 'magenta', 'black', 'grey', 'purple'],
    random: () => {
        return colours.values[Math.floor(Math.random() * colours.values.length)];
    }
}

const width = axesCanvas.width;
const height = axesCanvas.height;

//Draw axes
aCtx.lineWidth = 1;
aCtx.strokeStyle = 'black';
aCtx.beginPath();
aCtx.moveTo(0, height/2);
aCtx.lineTo(width, height/2);
aCtx.moveTo(width/2, 0);
aCtx.lineTo(width/2, height);
aCtx.stroke();

//Draw grid lines
const numberOfGridLines = 50;

aCtx.strokeStyle = 'rgba(0,0,0, 0.1)';
for (let i = 0; i <= width; i += width/numberOfGridLines) {
    aCtx.beginPath();
    aCtx.moveTo(i, 0);
    aCtx.lineTo(i, height);
    aCtx.stroke();
}
for (let i = 0; i <= height; i+= height/numberOfGridLines) {
    aCtx.beginPath();
    aCtx.moveTo(0, i);
    aCtx.lineTo(width, i);
    aCtx.stroke();
}

function graph(plotMethod){
    //Clear graph
    clearGraph();

    const domain = g('domainInput').value.split(',').map(x => parseFloat(x));
    const xViewSize = parseFloat(g('xView').value);
    const yViewSize = parseFloat(g('yView').value);
    
    //Draw axes labels
    lCtx.textBaseline = 'top';
    lCtx.textAlign = 'left';
    lCtx.fillText(`-${xViewSize}`, 0, height/2 + 5);
    lCtx.textAlign = 'right';
    lCtx.fillText(xViewSize, width - 5, height/2 + 5);
    lCtx.fillText(yViewSize, width/2 - 5, 5);
    lCtx.textBaseline = 'bottom';
    lCtx.fillText(`-${yViewSize}`, width/2 - 5, height);
    lCtx.textBaseline = 'top';
    lCtx.fillText('0', width/2 - 5, height/2 + 5);


    //Obtain plotting points
    const inputMethod = g('polyInput').value;
    let polyStr;
    if (inputMethod === 'parameter') {
        polyStr = polynomial.stringify(parseFloat(g('degreeInput').value), g('coefficientsInput').value.split(',').map(x => parseFloat(x)));
    } else if (inputMethod === 'string') {
        polyStr = `y=${g('stringInput').value}`;
    }
    
    let points;
    if (plotMethod === 'standard'){
        points = polynomial.plot(polyStr, domain, parseFloat(g('stepInput').value));
    } else if (plotMethod === 'smart') {
        points = polynomial.smartPlot(polyStr, {domain, sampleRate: parseFloat(g('sampleRateInput').value), precision: parseFloat(g('precisionInput').value)});
    }

    //Draw points onto graph
    pCtx.fillStyle = colours.random();
    const unitX = width / (xViewSize * 2);
    const unitY = height / (yViewSize * 2);
    const zeroPoint = [width / 2, height / 2];
    const pointSize = parseFloat(g('pointSizeIn').value);

    points.forEach((point, i) => {
        let [x, y] = point;
        x *= unitX;
        y *= unitY;

        if ((Math.abs(x) > (width / 2)) || (Math.abs(y) > (height / 2))) {
            //Removes points outside of graph, except for immediate one before or after
            let [nextX, nextY] = points[i + 1] || [null, null];
            nextX *= unitX;
            nextY *= unitY;
            if ((Math.abs(nextX) > (width / 2)) || (Math.abs(nextY) > (height / 2))) {
                points[i] = null;
                return;
            }
        }
        x += zeroPoint[0];
        if (y > 0) {
            y = zeroPoint[1] - y;
        } else {
            y = zeroPoint[1] + Math.abs(y);
        }
        
        pCtx.fillRect(x - (pointSize/2), y - (pointSize/2), pointSize, pointSize);
        points[i] = [x, y];
    });
    points = points.filter(x => x);

    //Draw function
    const graphThickness = parseFloat(g('graphThick').value);
    gCtx.strokeStyle = colours.random();
    gCtx.lineWidth = graphThickness;

    gCtx.beginPath();
    gCtx.moveTo(...points[0]);
    console.log(points);
    for (let i = 1; i < points.length; i++) {
        gCtx.lineTo(...points[i]);
    }
    gCtx.stroke();
}

function clearGraph(){
    pCtx.clearRect(0, 0, width, height);
    gCtx.clearRect(0, 0, width, height);
    lCtx.clearRect(0, 0, width, height);
}

g('standardGraphButton').addEventListener('click', () => {
    try {
        graph('standard');
    } catch (error) {
        alert(error);
    }
});
g('smartGraphButton').addEventListener('click', () => {
    try {
        graph('smart');
    } catch (error) {
        alert(error);
    }
});

g('showPoints').addEventListener('change', () => {
    pointsCanvas.style.display = g('showPoints').checked ? 'block' : 'none';
});
g('showGraph').addEventListener('change', () => {
    graphCanvas.style.display = g('showGraph').checked ? 'block' : 'none';
});

g('graphClear').addEventListener('click', clearGraph);