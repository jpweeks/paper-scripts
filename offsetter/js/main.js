
// Offsetter
// ---------

var offsetter = {
	generatePairs: (function () {
		var closestSegment = function (seg, segments) {
			var p0 = seg.point;
			var closest = Infinity;
			var candidate, match, dist;

			for (var i = 0, il = segments.length; i < il; i ++) {
				candidate = segments[i];
				dist = Math.abs(p0.y - candidate.point.y);

				if (dist < closest) {
					closest = dist;
					match = candidate;
				}
			}

			return match;
		};

		return function (pathA, pathB) {
			var segmentsA = pathA.segments;
			var segmentsB = pathB.segments;

			var index = {};
			var results = [];
			var seg, match, slug;

			for (var a = 0, al = segmentsA.length; a < al; a ++) {
				seg = segmentsA[a];
				match = closestSegment(seg, segmentsB);
				index[a + "-" + match.index] = true;
				results.push([seg, match]);
			}

			for (var b = 0, bl = segmentsB.length; b < bl; b ++) {
				seg = segmentsB[b];
				match = closestSegment(seg, segmentsA);
				slug = match.index + "-" + b;

				if (!index[slug]) {
					index[slug] = true;
					results.push([match, seg]);
				}
			}

			return results;
		};
	}())
};

// Scene
// -----

var layer = project.activeLayer;

var pathA = new Path([
	[100, 0],
	[30, 90],
	[100, 120],
	[150, 400]
]);

var pathB = new Path([
	[400, 10],
	[420, 300],
	[410, 350],
	[380, 420]
]);

pathA.strokeColor = pathB.strokeColor = "black";

// 

offsetter.generatePairs(pathA, pathB);






