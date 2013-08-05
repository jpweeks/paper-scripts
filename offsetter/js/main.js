
// Offsetter
// ---------

var Offsetter = function (sources, opts) {
	this.sources = new Group(sources);
	this.items = new Group(this.sources);

	this.sources.fullySelected = true;
	this.iterations = opts.iterations;

	this.setupGroups();
	this.update();

	this.items.style = this.style;

	tool.on("mousedown", this.onMouseDown.bind(this));
	tool.on("mousedrag", this.onMouseDrag.bind(this));

	if (opts.fillView) {
		view.on("resize", this.resize.bind(this));
	}
};

Offsetter.prototype = {

	style: {
		strokeColor: "black"
	},

	hitOpts: {
		tolerance: 15,
		selected: true,
		segments: true,
		handles: true
	},

	setupGroups: function () {
		var items = this.items;
		var sources = this.sources.children;

		var groups = this.groups = [];
		var pathA, pathB, paths, data;

		for (var i = 0, il = sources.length - 1; i < il; i ++) {
			pathA = sources[i];
			pathB = sources[i + 1];
			paths = new Group();

			data = {
				a: pathA,
				b: pathB,
				pairs: null,
				paths: paths
			};

			items.addChild(paths);
			pathA.groupB = pathB.groupA = data;
			groups.push(data);

			pathA.smooth();
		}
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

		var comparator = function (a, b) {
			return (a.a.index + a.b.index) - (b.a.index + b.b.index);
		};

		var indexPair = function (a, b, index) {
			var sa = "a" + a;
			var sb = "b" + b;

			index[a + "-" + b] = true;
		};

		var isIndexed = function (a, b, index) {
			return !!index[a + "-" + b];
		};

		return function (pathA, pathB) {
			var segmentsA = pathA.segments;
			var segmentsB = pathB.segments;

			var index = {};
			var pairs = [];
			var seg, match, pair, sa, sb;
			var i, il;

			for (i = 0, il = segmentsA.length; i < il; i ++) {
				seg = segmentsA[i];
				match = closestSegment(seg, segmentsB);

				indexPair(i, match.index, index);
				pairs.push({a: seg, b: match});
			}

			for (i = 0, il = segmentsB.length; i < il; i ++) {
				seg = segmentsB[i];
				match = closestSegment(seg, segmentsA);

				if (!isIndexed(match.index, i, index)) {
					indexPair(match.index, i, index);
					pairs.push({a: match, b: seg});
				}
			}

			return pairs.sort(comparator);
		};
	}()),

	updateGroup: (function () {
		var getOffset = function (p0, p1, iterations) {
			return (p1 - p0) / (iterations + 1);
		};

		return function (group) {
			if (!group) { return; }

			var pathGroup = group.paths;
			var paths = pathGroup.children;
			var pairs = group.pairs = this.pairSegments(group.a, group.b);
			var iterations = this.iterations;

			var iterationsDiff = (group._iterations || 0) - iterations;
			var pairsDiff = (group._pairsLength || 0) - pairs.length;

			var pair, path, segs, seg;
			var handleA, handleB, offset, step;
			var i, il, j, jl, s0, s1;

			// Remove unused paths
			if (iterationsDiff > 0) {
				pathGroup.removeChildren(paths.length - iterationsDiff, paths.length);
			}

			// Remove stray path segments
			if (pairsDiff > 0) {
				for (i = 0; i < iterations; i ++) {
					path = paths[i];
					segs = path.segments;
					path.removeSegments(segs.length - pairsDiff, segs.length);
				}
			}

			// Generate offset segments
			for (i = 0, il = pairs.length; i < il; i ++) {
				pair = pairs[i];
				s0 = pair.a;
				s1 = pair.b;

				offsetPoint = getOffset(s0.point, s1.point, iterations);
				offsetHandleIn = getOffset(s0.handleIn, s1.handleIn, iterations);
				offsetHandleOut = getOffset(s0.handleOut, s1.handleOut, iterations);

				for (j = 0; j < iterations; j ++) {
					path = paths[j];

					if (!path) {
						path = pathGroup.addChild(new Path());
						path.style = this.style;
					}

					step = j + 1;
					seg = path.segments[i] || path.add(new Point());
					seg.point = s0.point + offsetPoint * step;
					seg.handleIn = s0.handleIn + offsetHandleIn * step;
					seg.handleOut = s0.handleOut + offsetHandleOut * step;
				}
			}

			// Clamp generated path control points to prevent kinkiness
			this.smoothPaths(paths);

			group._iterations = iterations;
			group._pairsLength = pairs.length;

			return pathGroup;
		};
	}()),

	smoothPaths: (function () {
		var clampify = function (seg0, seg1, handleType) {
			if (!seg1) { return; }

			var len = (seg0.point - seg1.point).length;
			var handle = seg0[handleType];

			if (handle.length > len) {
				handle.length = len;
			}
		};

		return function (paths) {
			var path, segs, seg;

			for (var i = 0, il = paths.length; i < il; i ++) {
				path = paths[i];
				segs = path.segments;

				for (var j = 0, jl = segs.length; j < jl; j ++) {
					seg = segs[j];
					clampify(seg, segs[j - 1], "handleIn");
					clampify(seg, segs[j + 1], "handleOut");
				}
			}
		};
	}()),

	update: function () {
		var groups = this.groups;
		for (var i = 0, il = groups.length; i < il; i ++) {
			this.updateGroup(groups[i]);
		}
	},

	// UI
	onMouseDown: function (event) {
		var hitResult = this.sources.hitTest(event.point, this.hitOpts);
		var path, handle;

		if (hitResult) {
			path = hitResult.segment.path;

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

		this.selectedPath = path;
		this.selectedHandle = handle;
	},

	onMouseDrag: function (event) {
		var path = this.selectedPath;
		var handle = this.selectedHandle;

		if (handle) {
			handle.x += event.delta.x;
			handle.y += event.delta.y;

			this.updateGroup(path.groupA);
			this.updateGroup(path.groupB);
		}
	},

	resize: function (event) {
		this.items.fitBounds(view.size);
	}

};

// Scene
// -----

new Offsetter([

	new Path(
		[0, 0],
		[0, 1]
	),

	new Path(
		[0.07, 0.05],
		[0.12, 0.5],
		[0.08, 0.75],
		[0.1, 0.95]
	),

	new Path(
		[0.25, 0.05],
		[0.22, 0.5],
		[0.21, 0.95]
	),

	new Path(
		[0.33, 0.05],
		[0.28, 0.5],
		[0.32, 0.8],
		[0.3, 0.98]
	),

	new Path(
		[0.45, 0.05],
		[0.52, 0.15],
		[0.48, 0.25],
		[0.62, 0.35],
		[0.41, 0.95]
	),

	new Path(
		[0.75, 0.05],
		[0.82, 0.15],
		[0.62, 0.85],
		[0.71, 0.95]
	),

	new Path(
		[0.85, 0.01],
		[0.9, 0.12],
		[0.82, 0.35],
		[0.79, 0.9]
	),

	new Path(
		[1, 0],
		[1, 1]
	)

], {
	iterations: 20,
	fillView: true
});


