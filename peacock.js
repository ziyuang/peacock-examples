// from http://stackoverflow.com/a/15313435
function assert(condition, message) {
		if (!condition) {
				message = message || "Assertion failed";
				if (typeof Error !== "undefined") {
						throw new Error(message);
				}
				throw message; // Fallback
		}
}

// extract the M/C/L components in the description
function parseCurveDesc (desc) {
	var regexCoords = /([CML])([\d\., -]+)/g;
	var descMaps = [];
	var match;
	while (match = regexCoords.exec(desc)) {
		var flattenedCoords = match[2].trim().split(/[\s,]+/).map(Number);
		var coords = [];
		for (var i = 0; i < flattenedCoords.length; i+=2) {
			coords.push([flattenedCoords[i], flattenedCoords[i+1]]);
		}
		var map = {};
		map[match[1]] = coords;
		descMaps.push(map);
	}
	return descMaps;
}

// concatenate all the coordinates in the description
function concatCoords(descMaps) {
	var coords = [];
	descMaps.forEach(function (map) {
		for (var key in map) {
			map[key].forEach(function (coord) {
				coords.push(coord);
			});
		}
	});
	return coords;
}

function calcAdjacencyMap(allLines, radius, bundleCPThrsh) {
	var nLines = allLines.length;
	var adjacencyMap = {};
	for (var i = 0; i < nLines; i++) {
		adjacencyMap[i] = {};
	}
	for (var i = 0; i < nLines-1; i++) {
		for (var j = i+1; j < nLines; j++) {

			var iNeighbor = {"myEndpoints": [], "hisEndpoints": []};
			var jNeighbor = {"myEndpoints": [], "hisEndpoints": []};

			var segmentMap = countCommonKnots(allLines[i], allLines[j], radius);
			var endPointsI = segmentMap["line1SegmentEndpoints"];
			var endPointsJ = segmentMap["line2SegmentEndpoints"];

			assert(endPointsI.length == endPointsJ.length);

			for (var segIdx = 0; segIdx < endPointsI.length; segIdx++) {
				var segI = endPointsI[segIdx];
				var segJ = endPointsJ[segIdx];
				var segLengthI = Math.abs(segI[1] - segI[0]);
				var segLengthJ = Math.abs(segJ[1] - segJ[0]);

				assert(segLengthI == segLengthJ);

				// absolute or relative (=fractional) threshold
				var absoluteCriterion = bundleCPThrsh >= 1 && segLengthJ >= bundleCPThrsh;
				var relativeCriterion = 0 < bundleCPThrsh && bundleCPThrsh < 1 && segLengthJ/allLines[j].length > bundleCPThrsh;
				if (absoluteCriterion || relativeCriterion) {
					iNeighbor["myEndpoints"].push(segI);
					iNeighbor["hisEndpoints"].push(segJ);

					//symmetrize
					if (segJ[0] > segJ[1]) {
						jNeighbor["myEndpoints"].push([segJ[1], segJ[0]]);
						jNeighbor["hisEndpoints"].push([segI[1], segI[0]]);
					}
					else {
						jNeighbor["myEndpoints"].push(segJ);
						jNeighbor["hisEndpoints"].push(segI);
					}
				}
			}
			if (iNeighbor["myEndpoints"].length > 0) {
				adjacencyMap[i][j] = iNeighbor;
				adjacencyMap[j][i] = jNeighbor;
			}
		}
	}
	return adjacencyMap;
}

function countCommonKnots(line1, line2, radius) {
	var line1SegmentStart = 0;
	var line2SearchStart = 0;

	var line1SegmentEndpoints = [];
	var line2SegmentEndpoints = [];

	while (line1SegmentStart < line1.length) {
		var p1 = line1[line1SegmentStart];
		var line2SegmentStart = line2SearchStart;
		while (line2SegmentStart < line2.length) {
			var p2 = line2[line2SegmentStart];
			if (eDist(p1, p2) <= radius) {
				// check the subsequent points
				var k = 1;
				while (line1SegmentStart+k < line1.length && line2SegmentStart+k < line2.length) {
					var p1 = line1[line1SegmentStart + k];
					var p2 = line2[line2SegmentStart + k];
					if (eDist(p1, p2) <= radius) {
						k += 1;
					}
					else {
						break;
					}
				}

				var currentIdx1 = line1SegmentStart + k;
				var currentIdx2 = line2SegmentStart + k;
				line1SegmentEndpoints.push([line1SegmentStart, currentIdx1 - 1]);
				line2SegmentEndpoints.push([line2SegmentStart, currentIdx2 - 1]);

				line1SegmentStart = currentIdx1 - 1;
				line2SegmentStart = line2SearchStart = currentIdx2;
			}
			else {
				line2SegmentStart += 1;
			}
		}
		// if found a segment in a bundle, now line1SegmentStart = currentIdx1
		line1SegmentStart += 1;
	}

	// the other direction
	var line1SegmentEndpointsBackwards = [];
	var line2SegmentEndpointsBackwards = [];

	line1SegmentStart = 0;
	line2SearchStart = line2.length - 1;

	while (line1SegmentStart < line1.length) {
		var p1 = line1[line1SegmentStart];
		var line2SegmentStart = line2SearchStart;
		while (line2SegmentStart >= 0) {
			var p2 = line2[line2SegmentStart];
			if (eDist(p1, p2) <= radius) {
				// check the subsequent points
				var k = 1;
				while (line1SegmentStart+k < line1.length && line2SegmentStart-k >= 0) {
					var p1 = line1[line1SegmentStart + k];
					var p2 = line2[line2SegmentStart - k];
					if (eDist(p1, p2) <= radius) {
						k += 1;
					}
					else {
						break;
					}
				}

				var currentIdx1 = line1SegmentStart + k;
				var currentIdx2 = line2SegmentStart - k;
				line1SegmentEndpointsBackwards.push([line1SegmentStart, currentIdx1 - 1]);
				line2SegmentEndpointsBackwards.push([line2SegmentStart, currentIdx2 + 1]);

				line1SegmentStart = currentIdx1 - 1;
				line2SegmentStart = line2SearchStart = currentIdx2;
			}
			else {
				line2SegmentStart -= 1;
			}
		}
	
		line1SegmentStart += 1;
	}

	// choose the direction with longest segments

	var maxLengthForwards = 0;
	var maxLengthBackwards = 0;

	for (var i = 0; i < line1SegmentEndpoints.length; i++) {
		var endPoint = line1SegmentEndpoints[i];
		if (endPoint[1] - endPoint[0] > maxLengthForwards) {
			maxLengthForwards = endPoint[1] - endPoint[0];
		}
	};

	for (var i = 0; i < line1SegmentEndpointsBackwards.length; i++) {
		var endPoint = line1SegmentEndpointsBackwards[i];
		if (endPoint[1] - endPoint[0] > maxLengthBackwards) {
			maxLengthBackwards = endPoint[1] - endPoint[0];
		}
	};

	if (maxLengthBackwards > maxLengthForwards) {
		line1SegmentEndpoints = line1SegmentEndpointsBackwards;
		line2SegmentEndpoints = line2SegmentEndpointsBackwards;
	}

	return {"line1SegmentEndpoints": line1SegmentEndpoints, "line2SegmentEndpoints": line2SegmentEndpoints};
}


function eDist(p1, p2, sqrt) {
	sqrt = sqrt === undefined? true: sqrt;
	assert(p1.length == p2.length);

	var d = 0;
	for (var i = 0; i < p1.length; i++) {
		var diff = p1[i] - p2[i];
		d += diff * diff;
	}
	if (sqrt)
		return Math.sqrt(d);
	else
		return d;
}