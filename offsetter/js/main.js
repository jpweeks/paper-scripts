
// Offsetter
// ---------

var Offsetter = function (sources, opts) {
	this.sources = new Group(sources);
	this.items = new Group(this.sources);

	this.sources.selected = true;
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
			return (a[0].index + a[1].index) - (b[0].index + b[1].index);
		};

		return function (pathA, pathB) {
			var segmentsA = pathA.segments;
			var segmentsB = pathB.segments;

			var index = {};
			var pairs = [];
			var seg, match, slug;

			for (var a = 0, al = segmentsA.length; a < al; a ++) {
				seg = segmentsA[a];
				match = closestSegment(seg, segmentsB);

				index[a + "-" + match.index] = true;
				pairs.push([seg, match]);
			}

			for (var b = 0, bl = segmentsB.length; b < bl; b ++) {
				seg = segmentsB[b];
				match = closestSegment(seg, segmentsA);
				slug = match.index + "-" + b;

				if (!index[slug]) {
					index[slug] = true;
					pairs.push([match, seg]);
				}
			}

			return pairs.sort(comparator);
		};
	}()),

	updateGroup: function (group) {
		if (!group) { return; }

		var pathGroup = group.paths;
		var paths = pathGroup.children;
		var pairs = group.pairs = this.pairSegments(group.a, group.b);
		var iterations = this.iterations;

		var iterationsDiff = (group._iterations || 0) - iterations;
		var pairsDiff = (group._pairsLength || 0) - pairs.length;

		var pair, path, segs, seg;
		var p0, p1, diff;
		var i, il, j;

		if (iterationsDiff > 0) {
			pathGroup.removeChildren(paths.length - iterationsDiff, paths.length);
		}

		if (pairsDiff > 0) {
			for (i = 0; i < iterations; i ++) {
				path = paths[i];
				segs = path.segments;
				path.removeSegments(segs.length - pairsDiff, segs.length);
			}
		}

		for (i = 0, il = pairs.length; i < il; i ++) {
			pair = pairs[i];
			p0 = pair[0].point;
			p1 = pair[1].point;

			diff = (p1 - p0) / (iterations + 1);

			for (j = 0; j < iterations; j ++) {
				path = paths[j];
				if (!path) {
					path = pathGroup.addChild(new Path());
					path.style = this.style;
				}

				seg = path.segments[i] || path.add(new Point());
				seg.point = p0 + diff * (j + 1);
			}
		}

		group._iterations = iterations;
		group._pairsLength = pairs.length;

		return pathGroup;
	},

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


