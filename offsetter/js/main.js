
// Offsetter
// ---------

var Offsetter = function (sources, iterations) {
	this.sources = new Group(sources);
	this.sources.style = this.style;
	this.sources.selected = true;

	this.iterations = iterations;
	this.groups = this.setupGroups();

	this.update();

	tool.on("mousedown", this.onMouseDown.bind(this));
	tool.on("mousedrag", this.onMouseDrag.bind(this));
};

Offsetter.prototype = {

	style: {
		strokeColor: "black"
	},

	hitOpts: {
		selected: true,
		segments: true,
		handles: true
	},

	setupGroups: function () {
		var sources = this.sources.children;
		var iterations = this.iterations;
		var groups = [];
		var pathA, pathB, paths;

		for (var i = 0, il = sources.length - 1; i < il; i ++) {
			pathA = sources[i];
			pathB = sources[i + 1];
			paths = new Group();

			for (var j = 0; j < iterations; j ++) {
				paths.addChild(new Path());
			}

			paths.style = this.style;
			groups.push({
				a: pathA,
				b: pathB,
				pairs: null,
				paths: paths
			});
		}

		return groups;
	},

	// Compare two paths, pairing their segments by proximity
	pairSegments: (function () {

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

			this.sortPairs(results);
			return results;
		};
	}()),

	sortPairs: (function () {
		var comparator = function (a, b) {
			return (a[0].index + a[1].index) - (b[0].index + b[1].index);
		};

		return function (pairs) {
			return pairs.sort(comparator);
		};
	}()),

	updateGroup: function (group) {
		var iterations = this.iterations;
		var paths = group.paths.children;

		var pairs = group.pairs = this.pairSegments(group.a, group.b);
		var segments, pair;
		var p0, p1, diff;

		for (var i = 0, il = paths.length; i < il; i ++) {
			paths[i].removeSegments();
		}

		for (var j = 0, jl = pairs.length; j < jl; j ++) {
			pair = pairs[j];
			p0 = pair[0].point;
			p1 = pair[1].point;

			diff = (p1 - p0) / (iterations + 1);

			for (c = 0; c < iterations; c ++) {
				paths[c].add(p0 + diff * (c + 1));
			}
		}

		return paths;
	},

	update: function () {
		var groups = this.groups;
		for (var i = 0, il = groups.length; i < il; i ++) {
			this.updateGroup(groups[i]);
		}
	},

	// UI
	onMouseDown: function (event) {
		var handle;
		var hitResult = this.sources.hitTest(event.point, this.hitOpts);

		if (hitResult) {
			switch (hitResult.type) {
			case "handle-in":
				handle = hitResult.segment.handleIn;
				break;

			case "handle-out":
				handle = hitResult.segment.handleOut;
				break;

			case "segment":
				handle = hitResult.segment.point;
				break;
			}
		}

		this.handle = handle;
	},

	onMouseDrag: function (event) {
		var handle = this.handle;

		if (handle) {
			handle.x += event.delta.x;
			handle.y += event.delta.y;

			this.update();
		}
	}

};

// Scene
// -----

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

var pathC = new Path([
	[600, 10],
	[620, 300],
	[610, 350],
	[640, 370],
	[580, 420]
]);

var offsets = new Offsetter([pathA, pathB, pathC], 20);


