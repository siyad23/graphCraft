// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeTable();
    setupEventListeners();
    setupGraphControls();
});

// Graph zoom state
let currentZoom = 1;
let currentResults = null;

// Initialize with some empty rows
function initializeTable() {
    for (let i = 0; i < 5; i++) {
        addRow();
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addRowBtn').addEventListener('click', () => {
        addRow();
        calculateScaledCoordinates();
        // Focus on the new row's X input
        const tbody = document.getElementById('dataBody');
        const lastRow = tbody.lastElementChild;
        if (lastRow) {
            const xInput = lastRow.querySelector('.x-input');
            if (xInput) xInput.focus();
        }
    });
    
    document.getElementById('add5RowsBtn').addEventListener('click', () => {
        for (let i = 0; i < 5; i++) {
            addRow();
        }
        calculateScaledCoordinates();
    });
    
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    
    // Real-time calculation on grid dimension changes
    document.getElementById('gridWidth').addEventListener('input', calculateScaledCoordinates);
    document.getElementById('gridHeight').addEventListener('input', calculateScaledCoordinates);
    document.getElementById('axisInterval').addEventListener('input', calculateScaledCoordinates);
    
    // Real-time update on title changes
    document.getElementById('graphTitle').addEventListener('input', redrawGraphIfReady);
    document.getElementById('xAxisTitle').addEventListener('input', redrawGraphIfReady);
    document.getElementById('yAxisTitle').addEventListener('input', redrawGraphIfReady);
}

// Redraw graph if data is ready
function redrawGraphIfReady() {
    if (currentResults) {
        drawGraph(currentResults);
    }
}

// Row counter for unique IDs
let rowCounter = 0;

// Add a new row to the data table
function addRow() {
    const tbody = document.getElementById('dataBody');
    const row = document.createElement('tr');
    rowCounter++;
    
    row.innerHTML = `
        <td>${rowCounter}</td>
        <td><input type="number" step="any" placeholder="X" class="x-input" inputmode="decimal"></td>
        <td><input type="number" step="any" placeholder="Y" class="y-input" inputmode="decimal"></td>
        <td><button class="btn btn-danger btn-small delete-btn">✕</button></td>
    `;
    
    tbody.appendChild(row);
    
    // Add event listeners to new inputs for real-time calculation
    const xInput = row.querySelector('.x-input');
    const yInput = row.querySelector('.y-input');
    const deleteBtn = row.querySelector('.delete-btn');
    
    xInput.addEventListener('input', calculateScaledCoordinates);
    yInput.addEventListener('input', calculateScaledCoordinates);
    
    // Auto-advance to Y input after entering X
    xInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            yInput.focus();
            yInput.select();
        }
    });
    
    // Auto-advance to next row's X input after entering Y
    yInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextRow = row.nextElementSibling;
            if (nextRow) {
                const nextXInput = nextRow.querySelector('.x-input');
                if (nextXInput) {
                    nextXInput.focus();
                    nextXInput.select();
                }
            } else {
                addRow();
                calculateScaledCoordinates();
                const newRow = tbody.lastElementChild;
                const newXInput = newRow.querySelector('.x-input');
                newXInput.focus();
            }
        }
    });
    
    deleteBtn.addEventListener('click', function() {
        deleteRow(this);
    });
    
    updateRowNumbers();
}

// Delete a row
function deleteRow(button) {
    const row = button.closest('tr');
    row.remove();
    updateRowNumbers();
    calculateScaledCoordinates();
}

// Update row numbers after deletion
function updateRowNumbers() {
    const rows = document.querySelectorAll('#dataBody tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// Clear all data
function clearAll() {
    document.getElementById('dataBody').innerHTML = '';
    document.getElementById('resultsSection').style.display = 'none';
    rowCounter = 0;
    initializeTable();
}

// Get all data points from the table
function getDataPoints() {
    const rows = document.querySelectorAll('#dataBody tr');
    const dataPoints = [];
    
    rows.forEach((row, index) => {
        const xInput = row.querySelector('.x-input');
        const yInput = row.querySelector('.y-input');
        
        const x = parseFloat(xInput.value);
        const y = parseFloat(yInput.value);
        
        if (!isNaN(x) && !isNaN(y)) {
            dataPoints.push({ x, y, index: index + 1 });
        }
    });
    
    return dataPoints;
}

// Calculate scaled coordinates
function calculateScaledCoordinates() {
    const dataPoints = getDataPoints();
    const resultsSection = document.getElementById('resultsSection');
    
    if (dataPoints.length < 2) {
        resultsSection.style.display = 'none';
        return;
    }
    
    const gridWidth = parseInt(document.getElementById('gridWidth').value) || 90;
    const gridHeight = parseInt(document.getElementById('gridHeight').value) || 55;
    const axisInterval = parseInt(document.getElementById('axisInterval').value) || 5;
    
    // Find min and max values
    const xValues = dataPoints.map(p => p.x);
    const yValues = dataPoints.map(p => p.y);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    // Calculate ranges from 0 to max
    const xRange = xMax;
    const yRange = yMax;
    
    // Handle edge cases where max is 0
    const effectiveXRange = xRange === 0 ? 1 : xRange;
    const effectiveYRange = yRange === 0 ? 1 : yRange;
    
    // Maximum value should be between 85% to 95% of the grid
    // Calculate scale so that max value lands in this range with a nice number
    const xScalePerSquare = calculateNiceScaleInRange(effectiveXRange, gridWidth, 0.85, 0.95);
    const yScalePerSquare = calculateNiceScaleInRange(effectiveYRange, gridHeight, 0.85, 0.95);
    
    // Origin is always at (0, 0)
    const xStart = 0;
    const yStart = 0;
    
    // Calculate scaled coordinates
    const scaledPoints = dataPoints.map(point => {
        const scaledX = (point.x - xStart) / xScalePerSquare;
        const scaledY = (point.y - yStart) / yScalePerSquare;
        
        return {
            index: point.index,
            originalX: point.x,
            originalY: point.y,
            scaledX: Math.round(scaledX * 2) / 2,  // Round to nearest 0.5
            scaledY: Math.round(scaledY * 2) / 2   // Round to nearest 0.5
        };
    });
    
    // Display results
    displayResults({
        xMin,
        xMax,
        yMin,
        yMax,
        xRange: effectiveXRange,
        yRange: effectiveYRange,
        xScalePerSquare,
        yScalePerSquare,
        xStart,
        yStart,
        scaledPoints,
        axisInterval,
        gridWidth,
        gridHeight
    });
}

// Calculate a nice scale that keeps max value between minPercent and maxPercent of grid
function calculateNiceScaleInRange(maxValue, gridSize, minPercent, maxPercent) {
    // IMPORTANT: The scaled value must NEVER exceed the grid size
    // maxValue / scale = used grid squares
    // scale must be >= maxValue / gridSize to fit within grid
    const absoluteMinScale = maxValue / gridSize;  // Scale that uses exactly 100% of grid
    
    // Calculate the range of acceptable scales for 85-95% utilization
    const minScale = maxValue / (gridSize * maxPercent);  // Scale for 95%
    const maxScale = maxValue / (gridSize * minPercent);  // Scale for 85%
    
    // Find the smallest multiple of 0.5 that is >= absoluteMinScale
    const scale = Math.ceil(absoluteMinScale * 2) / 2;
    
    return scale;
}

// Display the results
function displayResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    
    // Update range info - range is from 0 to max
    document.getElementById('xRange').textContent = 
        `0 to ${results.xMax} (Range = ${results.xRange})`;
    document.getElementById('yRange').textContent = 
        `0 to ${results.yMax} (Range = ${results.yRange})`;
    
    document.getElementById('xScale').textContent = 
        `1 square = ${results.xScalePerSquare} units`;
    document.getElementById('yScale').textContent = 
        `1 square = ${results.yScalePerSquare} units`;
    
    // Generate axis markings
    const xAxisBody = document.getElementById('xAxisBody');
    const yAxisBody = document.getElementById('yAxisBody');
    xAxisBody.innerHTML = '';
    yAxisBody.innerHTML = '';
    
    // X-Axis markings
    for (let gridPos = 0; gridPos <= results.gridWidth; gridPos += results.axisInterval) {
        const value = gridPos * results.xScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(6));
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${gridPos}</td>
            <td>${displayValue}</td>
        `;
        xAxisBody.appendChild(row);
    }
    
    // Y-Axis markings
    for (let gridPos = 0; gridPos <= results.gridHeight; gridPos += results.axisInterval) {
        const value = gridPos * results.yScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(6));
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${gridPos}</td>
            <td>${displayValue}</td>
        `;
        yAxisBody.appendChild(row);
    }
    
    // Update scaled coordinates table
    const scaledBody = document.getElementById('scaledBody');
    scaledBody.innerHTML = '';
    
    results.scaledPoints.forEach(point => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${point.index}</td>
            <td>${point.originalX}</td>
            <td>${point.originalY}</td>
            <td>${point.scaledX}</td>
            <td>${point.scaledY}</td>
        `;
        scaledBody.appendChild(row);
    });
    
    // Draw the graph with regression
    drawGraph(results);
    
    // Show results section
    resultsSection.style.display = 'block';
}

// Calculate linear regression
function calculateRegression(points) {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (const point of points) {
        sumX += point.originalX;
        sumY += point.originalY;
        sumXY += point.originalX * point.originalY;
        sumX2 += point.originalX * point.originalX;
        sumY2 += point.originalY * point.originalY;
    }
    
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    
    for (const point of points) {
        const predicted = slope * point.originalX + intercept;
        ssTotal += (point.originalY - meanY) ** 2;
        ssResidual += (point.originalY - predicted) ** 2;
    }
    
    const rSquared = ssTotal === 0 ? 1 : 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, rSquared };
}

// Draw the graph
function drawGraph(results) {
    const canvas = document.getElementById('graphCanvas');
    if (!canvas) return;
    
    // Store results for zoom functionality
    currentResults = results;
    
    // Get title inputs
    const graphTitle = document.getElementById('graphTitle')?.value || '';
    const xAxisTitle = document.getElementById('xAxisTitle')?.value || '';
    const yAxisTitle = document.getElementById('yAxisTitle')?.value || '';
    
    const ctx = canvas.getContext('2d');
    
    // High resolution canvas with zoom support
    const dpr = window.devicePixelRatio || 1;
    const baseWidth = 1200;
    const baseHeight = 800;
    const padding = 100; // Increased padding for titles
    
    // Apply zoom
    const canvasWidth = baseWidth * currentZoom;
    const canvasHeight = baseHeight * currentZoom;
    
    // Set canvas size with device pixel ratio for sharpness
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    // Scale context for device pixel ratio
    ctx.scale(dpr, dpr);
    
    const scaledPadding = padding * currentZoom;
    const graphWidth = canvasWidth - scaledPadding * 2;
    const graphHeight = canvasHeight - scaledPadding * 2;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw graph title
    if (graphTitle) {
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${24 * currentZoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(graphTitle, canvasWidth / 2, 35 * currentZoom);
    }
    
    // Calculate regression
    const regression = calculateRegression(results.scaledPoints);
    
    // Display regression equation
    const slopeDisplay = isNaN(regression.slope) ? '0' : regression.slope.toFixed(4);
    const interceptVal = isNaN(regression.intercept) ? 0 : regression.intercept;
    const interceptDisplay = interceptVal >= 0 
        ? `+ ${interceptVal.toFixed(4)}` 
        : `- ${Math.abs(interceptVal).toFixed(4)}`;
    document.getElementById('regressionEquation').textContent = 
        `y = ${slopeDisplay}x ${interceptDisplay}`;
    document.getElementById('rSquared').textContent = 
        isNaN(regression.rSquared) ? '-' : regression.rSquared.toFixed(4);
    
    // Calculate scale for canvas
    const maxGridX = results.gridWidth;
    const maxGridY = results.gridHeight;
    const scaleX = graphWidth / maxGridX;
    const scaleY = graphHeight / maxGridY;
    
    // Helper function to convert grid coords to canvas coords
    function toCanvasX(gridX) {
        return scaledPadding + gridX * scaleX;
    }
    
    function toCanvasY(gridY) {
        return canvasHeight - scaledPadding - gridY * scaleY;
    }
    
    // Font size scales with zoom
    const baseFontSize = 12 * currentZoom;
    const smallFontSize = 10 * currentZoom;
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1 * currentZoom;
    
    // Vertical grid lines
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), scaledPadding);
        ctx.lineTo(toCanvasX(x), canvasHeight - scaledPadding);
        ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(scaledPadding, toCanvasY(y));
        ctx.lineTo(canvasWidth - scaledPadding, toCanvasY(y));
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2 * currentZoom;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(scaledPadding, canvasHeight - scaledPadding);
    ctx.lineTo(canvasWidth - scaledPadding, canvasHeight - scaledPadding);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(scaledPadding, canvasHeight - scaledPadding);
    ctx.lineTo(scaledPadding, scaledPadding);
    ctx.stroke();
    
    // Draw axis labels
    ctx.fillStyle = '#333';
    ctx.font = `${smallFontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // X-axis labels
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        const value = x * results.xScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(4));
        ctx.fillText(displayValue.toString(), toCanvasX(x), canvasHeight - scaledPadding + 20 * currentZoom);
    }
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        const value = y * results.yScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(4));
        ctx.fillText(displayValue.toString(), scaledPadding - 8 * currentZoom, toCanvasY(y) + 4 * currentZoom);
    }
    
    // Draw X-axis title
    if (xAxisTitle) {
        ctx.fillStyle = '#374151';
        ctx.font = `bold ${14 * currentZoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(xAxisTitle, canvasWidth / 2, canvasHeight - 20 * currentZoom);
    }
    
    // Draw Y-axis title (rotated)
    if (yAxisTitle) {
        ctx.save();
        ctx.fillStyle = '#374151';
        ctx.font = `bold ${14 * currentZoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.translate(25 * currentZoom, canvasHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yAxisTitle, 0, 0);
        ctx.restore();
    }
    
    // Draw regression line
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2.5 * currentZoom;
    ctx.setLineDash([8 * currentZoom, 8 * currentZoom]);
    
    // Find line endpoints using original data regression
    const origRegression = calculateRegression(results.scaledPoints.map(p => ({
        originalX: p.originalX,
        originalY: p.originalY
    })));
    
    const x1 = 0;
    const y1 = origRegression.intercept;
    const x2 = results.xMax * 1.1;
    const y2 = origRegression.slope * x2 + origRegression.intercept;
    
    // Convert to grid coordinates
    const gridX1 = x1 / results.xScalePerSquare;
    const gridY1 = y1 / results.yScalePerSquare;
    const gridX2 = x2 / results.xScalePerSquare;
    const gridY2 = y2 / results.yScalePerSquare;
    
    ctx.beginPath();
    ctx.moveTo(toCanvasX(gridX1), toCanvasY(gridY1));
    ctx.lineTo(toCanvasX(gridX2), toCanvasY(gridY2));
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw data points
    const pointRadius = 8 * currentZoom;
    ctx.fillStyle = '#0ea5e9';
    results.scaledPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(toCanvasX(point.scaledX), toCanvasY(point.scaledY), pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw point border
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2 * currentZoom;
        ctx.stroke();
    });
    
    // Draw legend (fixed position in top-right)
    const legendX = canvasWidth - 160 * currentZoom;
    const legendY = 25 * currentZoom;
    
    ctx.font = `${baseFontSize}px Arial`;
    ctx.textAlign = 'left';
    
    // Legend background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX - 15 * currentZoom, legendY - 15 * currentZoom, 170 * currentZoom, 55 * currentZoom);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 15 * currentZoom, legendY - 15 * currentZoom, 170 * currentZoom, 55 * currentZoom);
    
    // Data points legend
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(legendX, legendY, 6 * currentZoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillText('Data Points', legendX + 15 * currentZoom, legendY + 5 * currentZoom);
    
    // Regression line legend
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2 * currentZoom;
    ctx.setLineDash([5 * currentZoom, 5 * currentZoom]);
    ctx.beginPath();
    ctx.moveTo(legendX - 8 * currentZoom, legendY + 25 * currentZoom);
    ctx.lineTo(legendX + 8 * currentZoom, legendY + 25 * currentZoom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#333';
    ctx.fillText('Regression Line', legendX + 15 * currentZoom, legendY + 30 * currentZoom);
}

// Draw graph to a specific canvas (used for high-res PDF export)
function drawGraphToCanvas(canvas, ctx, results, scale) {
    const baseWidth = 1200;
    const baseHeight = 800;
    const padding = 100;
    
    const canvasWidth = baseWidth * scale;
    const canvasHeight = baseHeight * scale;
    const scaledPadding = padding * scale;
    const graphWidth = canvasWidth - scaledPadding * 2;
    const graphHeight = canvasHeight - scaledPadding * 2;
    
    // Get title inputs
    const graphTitle = document.getElementById('graphTitle')?.value || '';
    const xAxisTitle = document.getElementById('xAxisTitle')?.value || '';
    const yAxisTitle = document.getElementById('yAxisTitle')?.value || '';
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw graph title
    if (graphTitle) {
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${24 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(graphTitle, canvasWidth / 2, 35 * scale);
    }
    
    // Calculate regression
    const regression = calculateRegression(results.scaledPoints);
    
    // Determine grid bounds
    const maxGridX = results.gridWidth;
    const maxGridY = results.gridHeight;
    
    // Calculate scale factors
    const scaleX = graphWidth / maxGridX;
    const scaleY = graphHeight / maxGridY;
    
    // Helper function to convert grid coords to canvas coords
    function toCanvasX(gridX) {
        return scaledPadding + gridX * scaleX;
    }
    
    function toCanvasY(gridY) {
        return canvasHeight - scaledPadding - gridY * scaleY;
    }
    
    // Font sizes
    const baseFontSize = 12 * scale;
    const smallFontSize = 10 * scale;
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1 * scale;
    
    // Vertical grid lines
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), scaledPadding);
        ctx.lineTo(toCanvasX(x), canvasHeight - scaledPadding);
        ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        ctx.beginPath();
        ctx.moveTo(scaledPadding, toCanvasY(y));
        ctx.lineTo(canvasWidth - scaledPadding, toCanvasY(y));
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2 * scale;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(scaledPadding, canvasHeight - scaledPadding);
    ctx.lineTo(canvasWidth - scaledPadding, canvasHeight - scaledPadding);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(scaledPadding, canvasHeight - scaledPadding);
    ctx.lineTo(scaledPadding, scaledPadding);
    ctx.stroke();
    
    // Draw axis labels
    ctx.fillStyle = '#333';
    ctx.font = `${smallFontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // X-axis labels
    for (let x = 0; x <= maxGridX; x += results.axisInterval) {
        const value = x * results.xScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(4));
        ctx.fillText(displayValue.toString(), toCanvasX(x), canvasHeight - scaledPadding + 20 * scale);
    }
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= maxGridY; y += results.axisInterval) {
        const value = y * results.yScalePerSquare;
        const displayValue = Number.isInteger(value) ? value : parseFloat(value.toPrecision(4));
        ctx.fillText(displayValue.toString(), scaledPadding - 8 * scale, toCanvasY(y) + 4 * scale);
    }
    
    // Draw X-axis title
    if (xAxisTitle) {
        ctx.fillStyle = '#374151';
        ctx.font = `bold ${14 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(xAxisTitle, canvasWidth / 2, canvasHeight - 20 * scale);
    }
    
    // Draw Y-axis title (rotated)
    if (yAxisTitle) {
        ctx.save();
        ctx.fillStyle = '#374151';
        ctx.font = `bold ${14 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.translate(25 * scale, canvasHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yAxisTitle, 0, 0);
        ctx.restore();
    }
    
    // Draw regression line
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2.5 * scale;
    ctx.setLineDash([8 * scale, 8 * scale]);
    
    const origRegression = calculateRegression(results.scaledPoints.map(p => ({
        originalX: p.originalX,
        originalY: p.originalY
    })));
    
    const x1 = 0;
    const y1 = origRegression.intercept;
    const x2 = results.xMax * 1.1;
    const y2 = origRegression.slope * x2 + origRegression.intercept;
    
    const gridX1 = x1 / results.xScalePerSquare;
    const gridY1 = y1 / results.yScalePerSquare;
    const gridX2 = x2 / results.xScalePerSquare;
    const gridY2 = y2 / results.yScalePerSquare;
    
    ctx.beginPath();
    ctx.moveTo(toCanvasX(gridX1), toCanvasY(gridY1));
    ctx.lineTo(toCanvasX(gridX2), toCanvasY(gridY2));
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw data points
    const pointRadius = 8 * scale;
    ctx.fillStyle = '#0ea5e9';
    results.scaledPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(toCanvasX(point.scaledX), toCanvasY(point.scaledY), pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
    });
    
    // Draw legend
    const legendX = canvasWidth - 160 * scale;
    const legendY = 25 * scale;
    
    ctx.font = `${baseFontSize}px Arial`;
    ctx.textAlign = 'left';
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX - 15 * scale, legendY - 15 * scale, 170 * scale, 55 * scale);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 15 * scale, legendY - 15 * scale, 170 * scale, 55 * scale);
    
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(legendX, legendY, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillText('Data Points', legendX + 15 * scale, legendY + 5 * scale);
    
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2.5 * scale;
    ctx.setLineDash([6 * scale, 6 * scale]);
    ctx.beginPath();
    ctx.moveTo(legendX - 8 * scale, legendY + 25 * scale);
    ctx.lineTo(legendX + 8 * scale, legendY + 25 * scale);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#333';
    ctx.fillText('Regression Line', legendX + 15 * scale, legendY + 30 * scale);
}

// Setup graph zoom controls
function setupGraphControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const zoomLevelDisplay = document.getElementById('zoomLevel');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    
    if (!zoomInBtn) return; // Controls not yet in DOM
    
    zoomInBtn.addEventListener('click', () => {
        if (currentZoom < 3) {
            currentZoom += 0.25;
            updateZoom();
        }
    });
    
    zoomOutBtn.addEventListener('click', () => {
        if (currentZoom > 0.5) {
            currentZoom -= 0.25;
            updateZoom();
        }
    });
    
    resetZoomBtn.addEventListener('click', () => {
        currentZoom = 1;
        updateZoom();
    });
    
    // PDF Download functionality
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            const canvas = document.getElementById('graphCanvas');
            if (!canvas || !currentResults) {
                alert('No graph to download. Please calculate coordinates first.');
                return;
            }
            
            try {
                // Get title for filename
                const graphTitle = document.getElementById('graphTitle')?.value || 'graph';
                const sanitizedTitle = graphTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'graph';
                
                // Create a high-resolution off-screen canvas for PDF export
                const exportCanvas = document.createElement('canvas');
                const exportCtx = exportCanvas.getContext('2d');
                
                // Use high resolution for crisp PDF (3x base resolution)
                const exportScale = 3;
                const baseWidth = 1200;
                const baseHeight = 800;
                
                exportCanvas.width = baseWidth * exportScale;
                exportCanvas.height = baseHeight * exportScale;
                
                // Draw high-res version
                drawGraphToCanvas(exportCanvas, exportCtx, currentResults, exportScale);
                
                // Create PDF using jsPDF
                const { jsPDF } = window.jspdf;
                
                // Use landscape for wider graphs
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                });
                
                // Get page dimensions
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                // Calculate dimensions to fit the page with margins
                const margin = 10;
                const maxWidth = pageWidth - 2 * margin;
                const maxHeight = pageHeight - 2 * margin;
                
                // Calculate aspect ratio and fit to page
                const aspectRatio = baseWidth / baseHeight;
                let pdfWidth = maxWidth;
                let pdfHeight = pdfWidth / aspectRatio;
                
                if (pdfHeight > maxHeight) {
                    pdfHeight = maxHeight;
                    pdfWidth = pdfHeight * aspectRatio;
                }
                
                // Center on page
                const xOffset = (pageWidth - pdfWidth) / 2;
                const yOffset = (pageHeight - pdfHeight) / 2;
                
                // Add high-quality image to PDF
                const imgData = exportCanvas.toDataURL('image/png', 1.0);
                pdf.addImage(imgData, 'PNG', xOffset, yOffset, pdfWidth, pdfHeight, undefined, 'FAST');
                
                // Check if data table should be included
                const includeTable = document.getElementById('includeTableCheckbox')?.checked;
                if (includeTable && currentResults) {
                    // Add second page for data table
                    pdf.addPage('a4', 'portrait');
                    
                    const tablePageWidth = pdf.internal.pageSize.getWidth();
                    const tablePageHeight = pdf.internal.pageSize.getHeight();
                    const tableMargin = 15;
                    let yPos = tableMargin;
                    
                    // Title
                    pdf.setFontSize(18);
                    pdf.setFont('helvetica', 'bold');
                    const tableTitle = graphTitle || 'Data Table';
                    pdf.text(tableTitle + ' - Data', tablePageWidth / 2, yPos, { align: 'center' });
                    yPos += 15;
                    
                    // Scale info
                    pdf.setFontSize(11);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(`X-Axis Scale: 1 square = ${currentResults.xScalePerSquare}`, tableMargin, yPos);
                    yPos += 6;
                    pdf.text(`Y-Axis Scale: 1 square = ${currentResults.yScalePerSquare}`, tableMargin, yPos);
                    yPos += 12;
                    
                    // Table headers
                    const colWidths = [15, 35, 35, 45, 45];
                    const headers = ['#', 'Original X', 'Original Y', 'Grid X (sq)', 'Grid Y (sq)'];
                    const startX = tableMargin;
                    
                    pdf.setFillColor(14, 165, 233); // Sky blue
                    pdf.rect(startX, yPos - 5, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
                    
                    pdf.setTextColor(255, 255, 255);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(10);
                    let xPos = startX + 2;
                    headers.forEach((header, i) => {
                        pdf.text(header, xPos, yPos);
                        xPos += colWidths[i];
                    });
                    yPos += 8;
                    
                    // Table rows
                    pdf.setTextColor(0, 0, 0);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    
                    currentResults.scaledPoints.forEach((point, index) => {
                        // Check if need new page
                        if (yPos > tablePageHeight - 20) {
                            pdf.addPage('a4', 'portrait');
                            yPos = tableMargin;
                        }
                        
                        // Alternate row colors
                        if (index % 2 === 0) {
                            pdf.setFillColor(241, 245, 249);
                            pdf.rect(startX, yPos - 4, colWidths.reduce((a, b) => a + b, 0), 6, 'F');
                        }
                        
                        const rowData = [
                            (index + 1).toString(),
                            point.originalX.toString(),
                            point.originalY.toString(),
                            point.scaledX.toFixed(2),
                            point.scaledY.toFixed(2)
                        ];
                        
                        xPos = startX + 2;
                        rowData.forEach((cell, i) => {
                            pdf.text(cell, xPos, yPos);
                            xPos += colWidths[i];
                        });
                        yPos += 6;
                    });
                    
                    // Add regression info at bottom
                    yPos += 10;
                    if (yPos > tablePageHeight - 30) {
                        pdf.addPage('a4', 'portrait');
                        yPos = tableMargin;
                    }
                    
                    const regression = calculateRegression(currentResults.scaledPoints);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(11);
                    pdf.text('Regression Analysis:', tableMargin, yPos);
                    yPos += 7;
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(`Equation: y = ${regression.slope.toFixed(4)}x + ${regression.intercept.toFixed(4)}`, tableMargin, yPos);
                    yPos += 6;
                    pdf.text(`R² = ${regression.rSquared.toFixed(6)}`, tableMargin, yPos);
                }
                
                // Download PDF
                pdf.save(`${sanitizedTitle}.pdf`);
            } catch (error) {
                console.error('PDF generation error:', error);
                alert('Error generating PDF. Please try again.');
            }
        });
    }
    
    function updateZoom() {
        zoomLevelDisplay.textContent = Math.round(currentZoom * 100) + '%';
        if (currentResults) {
            drawGraph(currentResults);
        }
    }
}