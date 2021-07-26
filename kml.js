/**
 * You'll see some magic numbers like 1.0132 and 0.621 - these are because
 * haversine only works on a perfect sphere which most planets are not.
 * https://developers.google.com/kml/faq#linesdisappear  We need a db with
 * elevations per latlong.
 *
 * LatLong Calcs from http://www.movable-type.co.uk/scripts/latlong.html
 */
var EARTH_MEAN_RADIUS = 6371;

function tassert(condition, test) {
	if (!condition) {
		debugger;
	}
}
assert = tassert;

// Context for running helpers, handles parsing and saving KMLs.
class Context {
	constructor() {
		this._kml = null;
		this._kml2 = null;
	}

	getKML() {
		this._kml = this._loadXmlDoc("#kmlText");
		return this._kml;
	}
	getKML2() {
		this._kml2 = this._loadXmlDoc("#kmlText2");
		return this._kml2;
	}

	getLatLong(index) {
		if (0 === index || !index) {
			index = "";
		}
		var textarea = $("#kmlText" + index);
		var text = textarea.val()
		return LatLong.parse(text);
	}

	getInteger(index) {
		if (0 === index || !index) {
			index = "";
		}
		var textarea = $("#kmlText" + index);
		var text = textarea.val();
		return parseInt(text);
	}


	_loadXmlDoc(selector) {
		var result = null;
		var xml = $(selector).val();
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(xml, "text/xml");
		var parseerror = $(xmlDoc).find("parsererror");

		if (parseerror.length === 0) {
			result = xmlDoc;
		}
		else {
			throw xmlDoc;
		}

		return result;
	}

	save(xmlDoc) {
		if (xmlDoc === this._kml || xmlDoc === this._kml2) {
			this._saveKML(xmlDoc, "#kmlText");
		}
	}

	_saveKML(xmlDoc, selector) {
		const oSerializer = new XMLSerializer();
		const xml = oSerializer.serializeToString(xmlDoc);
		$(selector).val(xml);
	}
}
function deg2rad(deg) {
	return (2 * Math.PI * deg)/360;
}

class LatLong {
	constructor(lat, long, altitude) {
		this.lat = lat;
		this.long = long;
		this.alt = altitude ? altitude : 0;
	}

	/**
	 * <gx:coord>-122.862637 39.121016 403.89</gx:coord>
	 */
	static parseGXCoordfunction(data) {
		var result;

		if (data && typeof data === "string") {
			data = data.trim();
			var b = data.split(" ");
			var lat = parseFloat(b[1]);
			var long = parseFloat(b[0]);
			var alt = parseFloat(b[2]) || null;

			if (!isNaN(lat) && !isNaN(long)) {
				result = new LatLong(lat, long, alt);
			}
		}

		return result;
	}

	static parse(data) {
		var result;

		if (data && typeof data === "string") {
			var b = data.split(",");

			if (b.length >= 2) {
				var lat = parseFloat(b[1]);
				var long = parseFloat(b[0]);

				if (!isNaN(lat) && !isNaN(long)) {
					result = new LatLong(lat, long);
				}
			}
		}

		return result;
	}

	toString() {
		return this.long + "," + this.lat + "," + this.alt;
	};

	isEqual(other) {
		if (other.latLong) {
			other = other.latLong;
		}
		return this.lat === other.lat && this.long === other.long;
	}

	// Kilometers
	distance(other) {
		var R = EARTH_MEAN_RADIUS; // km
		var lat1 = deg2rad(this.lat);
		var lon1 = deg2rad(this.long);
		var lat2 = deg2rad(other.lat);
		var lon2 = deg2rad(other.long);

		var dLat = (lat2-lat1);
		var dLon = (lon2-lon1);

		var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		var d = R * c;
		return d;
	};
}

class LineSegment {
	constructor(A, B) {
		this.A = A;
		this.B = B;
	}

	slope() {
		return (this.A.y - this.B.y) / (this.A.x - this.B.x);
	};

	length() {
		return Math.sqrt(Math.pow(this.A.y - this.B.y, 2) + Math.pow(this.A.x - this.B.x, 2));
	}

	/**
	 Find intersection by converting to slope/intercept form and setting equal.
	 	y = mx + b
	 **/
	intersect(other) {
		var result = { x: 0/0, y: 0/0 };
		// b = y - mx
		var b1 = this.A.y - this.slope() * this.A.x;
		var b2 = other.A.y - other.slope() * other.A.x;

		var m1 = this.slope();
		var m2 = other.slope();

		result.x = (b2 - b1) / (m1 - m2);
		result.y = m2 * result.x + b2;

		return result;
	};

	static test() {
		var ls;

		// Test Dot
		ls = new LineSegment(new Point(1,1), new Point(1,1));
		tassert(isNaN(ls.slope()));
		tassert(ls.length() === 0);

		// Test Vertical
		ls = new LineSegment(new Point(1,1), new Point(1,2));
		tassert(!isFinite(ls.slope()));
		tassert(ls.length() === 1);

		// Test Horizontal
		ls = new LineSegment(new Point(1,1), new Point(2,1));
		tassert(ls.slope() === 0/1);
		tassert(ls.length() === 1);

		// Test Neg/Pos Slopes
		ls = new LineSegment(new Point(1,1), new Point(2,2));
		tassert(ls.slope() === 1);
		tassert(ls.length() === Math.sqrt(2));

		ls = new LineSegment(new Point(1,1), new Point(0,2));
		tassert(ls.slope() === -1);
		tassert(ls.length() === Math.sqrt(2));

		// Intersect
		var AB = new LineSegment(new Point(2, 2), new Point(4, 4));
		var CD = new LineSegment(new Point(5, 0), new Point(4, 1));
		var E = AB.intersect(CD);
		tassert(E.x = 5/2);
		tassert(E.y = 5/2)

		console.log('LineSegment test PASSED')
	}
}

class Point {
	constructor(x,y) {
		this.x = x;
		this.y = y;
	}
}

class LineString {
	constructor(coordinates, margin) {
		this._coordinates = coordinates || [];
		this._margin = margin || "";
	}

	static parseCoordinates(kmlCoords) {
		var result = null;

		if (kmlCoords && typeof kmlCoords === "string") {
			var coordinates = [];
			var whitespace = kmlCoords.match(/^\s+/i)
			if (whitespace && whitespace.length >= 1) {
				whitespace = whitespace[0];
			}

			var b = kmlCoords.split(/\s+/);

			for (var i = 0 ; i < b.length ; i++) {
				if ( b[i] !== "") {
					var latLong = LatLong.parse(b[i]);
					if (latLong) {
						coordinates.push(latLong);
					}
					else {
						alert("Invalid Coordinates " + b[i]);
						coordinates = null;
						break;
					}
				}
			}

			if (coordinates !== null) {
				result = new LineString(coordinates, whitespace);
			}
		}

		return result;
	}

	coordinates() { return this._coordinates; }

	/**
	Splits this string every N miles.
	*/
	splitAtMileage(mileage, inMiles) {
		var strings = [];
		var last = this._coordinates[0];
		var ls = new LineString();
		var accum = 0;

		// Magic # to get us close to Google Earth's distnaces.
		//mileage = mileage / 1.01329122253;

		if (inMiles) {
			mileage /= 0.621371;
		}

		for (var i = 0 ; i < this._coordinates.length ; i++) {
			ls.push(this._coordinates[i]);
			accum += this._coordinates[i].distance(last);
			last = this._coordinates[i];

			if ((accum > mileage) || i === (this._coordinates.length - 1)) {
				strings.push(ls)
				ls = new LineString();
				ls.push(this._coordinates[i]);
				accum = 0;
			}
		}

		return strings;
	};

	/** Concats linestrings - doesn't duplicate the points thus the latlongs
	 * are shared, could be an issue.
	 */
	push(latLong) {
		this._coordinates.push(latLong);
	};

	/** Concats linestrings - doesn't duplicate the points thus the latlongs
	 * are shared, could be an issue.
	 */
	concat(other) {
		this._coordinates = this._coordinates.concat(other._coordinates)
	};

	reverse() {
		this._coordinates.reverse();
	};

	/** Returns string length in kilometers or miles.
	 */
	distance(miles) {
		var accum = 0;

		for (var i = 0 ; i < this._coordinates.length - 1 ; i++ ) {
			accum += this._coordinates[i].distance(this._coordinates[i + 1]);
		}

		// HACK - this 1.0132... # is to get us in sync with GEarth.  Not sure
		// why our distance is off by this amount...haversine distance bug?
		accum *= 1.01329122253;

		if (miles) {
			accum *= 0.621371;
		}

		return accum;
	};

	intersections(other) {
		var result = [];

		for (var i = 0 ; i < this._coordinates.length ; i++ ) {
			var index = other.indexOf(this._coordinates[i]);

			if (-1 !== index) {
				result.push({index:i, latLong:this._coordinates[i]});
			}
		}

		return result;
	};

	static test_nearestPointTo() {
		var ls = new LineString([new LatLong(0,0), new LatLong(1,1), new LatLong(2,2)])
		var pt = new LatLong(1.1, 0.9);
		var expect = new LatLong(1,1);
		var near = ls.nearestPointTo(pt);
		if (near.index === -1 || !near.latLong.isEqual(expect)) {
			console.error("test_nearestPointTo #fail");
		}
		console.log('LineString test_nearestPointTo PASSED')
	}

	nearestPointTo(point) {
		var min = { index:-1, latLong:null, distance:1/0 };

		$.each(this._coordinates, function(index, coordinate) {
			var distance = point.distance(coordinate);

			if (distance < min.distance) {
				min.index = index;
				min.distance = distance;
				min.latLong = coordinate;
			}
		});

		return min;
	};

	split(where, inclusive) {
		var result;
		var index = where.index || this.indexOf(where);
		var latLong = where.latLong || where;

		if (-1 !== index) {
			result = new LineString(this._coordinates.splice(index));

			if (inclusive) {
				this._coordinates.push(latLong);
			}

		}

		return result;
	};

	getStartPoint() {
		return this._coordinates[0];
	}

	getEndPoint() {
		return this._coordinates[this._coordinates.length - 1];
	}

	indexOf(latLong) {
		var result = -1;

		for (var i = 0 ; i < this._coordinates.length ; i++ ) {
			if (this._coordinates[i].isEqual(latLong)) {
				result = i;
				break;
			}
		}

		return result;
	}

	toXMLString() {
		var result = this._margin;

		for (var i = 0 ; i < this._coordinates.length ; i++ ) {
			var coordinate = this._coordinates[i];

			if (i) {
				result += " ";
			}

			result += coordinate.toString();
		}

		result += this._margin;
		return result;
	};
}

class Helpers {
	static addDistance2Name(xml) {
		/**
		 * In GEarth I commonly suffix track names with their length so it's easy to
		 * see how far we'll go in a day.  This method does that for any linestring
		 * found in the KML.
		 */
		var result = null;
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(xml, "text/xml");

		var lss = $(xmlDoc).find("Placemark LineString");

		if (lss.length > 0) {
			lss.each(function(index, ls) {
				var nameNode = $(ls).parent().find("name")
				var coordNode = $(ls).find("coordinates");
				var name = nameNode.text();
				var lineString = LineString.parseCoordinates(coordNode.text());
				// HACK - this 1.0132... # is to get us in sync with GEarth.  Not sure
				// why our distance is off by this amount...haversine distance bug?
				var dist = lineString.distance(true).toFixed(1);
				var re = /(\.*)\(\d+(\.\d+){0,1}M\)$/ig;

				if (re.test(name)) {
					name = name.replace(re, "").trim();
				}

				name += " (" + dist + "M)";
				nameNode.text(name);
			});

			var oSerializer = new XMLSerializer();
			result = oSerializer.serializeToString(xmlDoc);
		}
		else {
			alert("No Placemarks Nodes found - document unchanged.")
		}

		return result;
	}

	static removeMultiGeometry(ctx) {
		/**
		 * Many KML files I get have a single line string in a multigeometry section.
		 * Google Earth doesn't expose the singular linestring in it's interface which
		 * means I can't extract it in order to get length and altitude from it.
		 * This helper does just that simple thing.
		 */
		var xmlDoc = ctx.getKML();
		var mgs = $(xmlDoc).find("Placemark MultiGeometry");

		if (mgs.length > 0) {
			mgs.each(function(index, mg) {
				// jQuery doesn't count text nodes - this $(mg) is a cheat to find out if
				// there's just a single child geometry.
				if ($(mg).children().length === 1) {
					while (mg.childNodes.length) {
						mg.parentNode.insertBefore(mg.childNodes[0], mg);
					}
					mg.parentNode.removeChild(mg);
				}
				else {
					var name = $(mg).parent().find("name").text();
					alert("PlaceMark '" + name + "' has multiple MultiGeometry nodes, skipping.");
				}
			});
			ctx.save(xmlDoc);
		}
		else {
			alert("No MultiGeometry nodes found - document unchancged.")
		}
	}


	static makeMultiGeometry(ctx) {
	/**
	 * TBD - Combine 1 or more linestrings together into a multigeometry (not sure
	 * if this will work on a Garmin GPS - test first)
	 */
	alert("TBD")
	}

	static reversePath(xml) {
		var result = null;
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(xml, "text/xml");

		var lss = $(xmlDoc).find("Placemark LineString");

		if (lss.length > 0) {
			if (lss.length > 1) {
				alert("Found " + lss.length + " Linestring(s) - reversing them all.")
			}

			lss.each(function(index, ls) {
				var coordNode = $(ls).find("coordinates");
				var lineString = LineString.parseCoordinates(coordNode.text());
				lineString.reverse();
				coordNode.text(lineString.toXMLString());
			});

			var oSerializer = new XMLSerializer();
			result = oSerializer.serializeToString(xmlDoc);
		}
		else {
			alert("No Placemarks Nodes found - document unchanged.")
		}

		return result;
	}

	static gx2LineString(xml) {
		/**
			Replace gx:track with LineString - common for garmin GPS imports.

			<PlaceMark><gx:track>lat long alt</gx:track></placemark>

			--->

			<LineString>
				<tessellate>1</tessellate>
				<coordinates>
					LatLongs+
				</coordinates>
			</LineString>
		 */
		var count = 0;
		var result = null;
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(xml, "text/xml");

		var gxTracks = $(xmlDoc).find("gx\\:Track");

		if (gxTracks.length > 0) {
			gxTracks.each(function(index, gxTrack) {
				count++;
				var ls = xmlDoc.createElement("LineString");
				var t = xmlDoc.createElement("tessellate");
				t.textContent = "1";
				ls.appendChild(t);
				var coords = xmlDoc.createElement("coordinates");
				ls.appendChild(coords);
				var newCoords = [];

				var gxCoords = $(gxTrack).find("gx\\:coord");
				if (gxCoords.length) {
					$.each(gxCoords, function(index, gxCoord) {
						var latLong = LatLong.parseGXCoord(gxCoord.textContent);
						newCoords.push(latLong);
					});

					coords.textContent = new LineString(newCoords).toXMLString();
					gxTrack.parentNode.insertBefore(ls, gxTrack);
					gxTrack.parentNode.removeChild(gxTrack);

					var oSerializer = new XMLSerializer();
					result = oSerializer.serializeToString(xmlDoc);
				}
				else {
					alert("gxTrack found with no coords - document unchanged.")
				}
			});

			if (count) {
				alert("Converted " + count + " gx:track nodes to LineStrings.")
			}
		}
		else {
			alert("No gx:track nodes found - document unchanged.")
		}

		return result;
	}

	static getInfo(xml) {
		alert('not yet implemented - ideas are outline of KML, length of string, # points, # line')
	}

	static split(ctx) {
		alert("TBD")
		return
		/**
		 Very naive split that looks for a single intersection at the end point of either
		 segment.  If no exact intersection exists we look for the endpoint closest to one
		 path and split there.  Really meant to be an auto-split that fragments the strings.
		 **/
		var kml1 = ctx.getKML();
		var kml2 = ctx.getKML2()

		// Find the 1st placemark linesting in each, should only be one.
		var lss1 = $(kml1).find("Placemark LineString");
		var lss2 = $(kml2).find("Placemark LineString");

		if (lss1.length === 1 && lss2.length === 1) {
			// Search for all intersections between them.
			var coordNode1 = $(lss1[0]).find("coordinates");
			var coordNode2 = $(lss2[0]).find("coordinates");

			var lineString1 = LineString.parseCoordinates(coordNode1.text());
			var lineString2 = LineString.parseCoordinates(coordNode2.text());

			var intersections = lineString1.intersections(lineString2);

			if (intersections.length === 1) {
				var where = intersections[0];
				var who = lineString1;

				// Break the string where the point falls in the middle
				if ((0 < where.index) && (lineString1.getLength() - 1 > where.index)) {
					who = lineString2;
				}

				// Split 'who'
				var placemark = who.parentNode;
				var newSegment = placemark.clone()
				placemark.parentNode.insertBefore(newSegment, placemark);
				var newLineString = who.splitAt(where);
				$(placemark).find("coordinates").text(lineString1.toXMLString());
				$(newSegment).find("coordinates").text(newLineString.toXMLString());

				ctx.save(who);
			}
			else {
				alert("Can't split, found " + intersections.length + " intersections.");
			}
		}
		else {
			alert("KMLs must have a single linestring each.");
		}
	}


	/**
	 Very naive split that looks for a single intersection at the end point of either
	 segment.  If no exact intersection exists we look for the endpoint closest to one
	 path and split there.
	 **/

	static splitAtPoint(ctx) {
		var kml = ctx.getKML();
		var point = ctx.getLatLong(2);

		if (!point) {
			alert('Invalid point - put a valid Lat,Long into the "2nd KML" input then try again.')
			return
		}

		// Find the 1st linesting, should only be one.
		var lss = $(kml).find("Placemark LineString");

		if (lss.length === 1) {
			// Search for all intersections between them.
			var coordNode = $(lss[0]).find("coordinates");

			var lineString = LineString.parseCoordinates(coordNode.text());
			var where = lineString.nearestPointTo(point);

			if (where) {
				// Split 'who'
				var placemark = lss[0].parentNode
				var newSegment = placemark.cloneNode(true)
				var oldName = $("name", newSegment).text();
				$("name", newSegment).text(oldName + " (SPLIT)");
				placemark.parentNode.insertBefore(newSegment, placemark.nextSibling);
				var newLineString = lineString.split(where, true);
				$(placemark).find("coordinates").text(lineString.toXMLString());
				$(newSegment).find("coordinates").text(newLineString.toXMLString());

				ctx.save(kml);
			}
			else {
				alert("Can't split, found " + intersections.length + " intersections.");
			}
		}
		else {
			alert("KMLs must have a single linestring each.");
		}
	}

	/**
	 Splits the first linestring found every N miles.
	 **/

	static splitAtDistance(ctx) {
		var kml = ctx.getKML();
		var distance = ctx.getInteger(2);

		// Find the 1st linesting, should only be one.
		var lss = $(kml).find("Placemark LineString");

		if (lss.length === 1) {
			var placemark = lss[0].parentNode
			console.log("Found Track " + $("name", placemark).text());
			console.log("Splitting at mileage " + distance);

			var coordNode = $(lss[0]).find("coordinates");
			var lineString = LineString.parseCoordinates(coordNode.text());
			var strings = lineString.splitAtMileage(distance, true);

			for (var i = 0 ; i < strings.length ; i++) {
				var newSegment = placemark.cloneNode(true)
				var oldName = $("name", newSegment).text();
				$("name", newSegment).text(oldName + " - Split #" + (i + 1));
				placemark.parentNode.insertBefore(newSegment, null);
				$(newSegment).find("coordinates").text(strings[i].toXMLString());
			}

			ctx.save(kml);
		}
		else {
			alert("KMLs must have a single linestring each.");
		}
	}

	/** Combines multiple tracks into one.  Determines best fit by comparing start and
	 * end points of each string.
	 */
	static combineStrings(ctx) {
		var kml = ctx.getKML();
		var point = ctx.getLatLong(2);

		// Find the 1st linesting, should only be one.
		var lss = $(kml).find("Placemark LineString");

		if (lss.length > 0) {
			// Build a list of every line string.
			var strings = [];
			var lssNodesCopy = []
			var lineStringCopy = []
			var lineStringMap = {}

			lss.each(function(index, lsNode) {
				// Search for all intersections between them.
				var coordNode = $(lsNode).find("coordinates");
				var lineString = LineString.parseCoordinates(coordNode.text());
				// Turn each linestring into a doubly linked list and put it in a
				// lookup table for later use.
				lineString.__id = Math.random();
				lineString.__next = null;
				lineString.__prev = null;
				lineString.__near = [];
				lineString.lsNode = lsNode;
				lineString.getPlaceMarkName = function() {
					var placemark = this.lsNode.parentNode
					return $("name", placemark).text();
				}
				console.log("PlaceMark : " + lineString.getPlaceMarkName())
				lineStringMap[lineString.id] = lineString
				strings.push(lineString);
				lssNodesCopy.push(lsNode);
				lineStringCopy.push(lineString);
			});

			console.log("Found " + strings.length + " linestrings.")

			// Compare the ends of each segment and sort by distance to determine
			// the best order.
			console.log("Comparing begin and end points of each segment to find best connections.")

			var ends = []

			$.each(strings, function(index, string) {
				ends.push({point:string.getStartPoint(), string:string});
				ends.push({point:string.getEndPoint(), string:string});
			})

			var pairs = [];

			for (var outer = 0 ; outer < ends.length - 1 ; outer++) {
				for (var inner = outer + 1 ; inner < ends.length ; inner++ ) {
					var p1 = ends[outer];
					var p2 = ends[inner];

					// Skip any 2 points on the same string.
					if (p1.string !== p2.string) {
						var distance = p1.point.distance(p2.point);
						pairs.push({ p1:p1, p2:p2, distance:distance })
					}
				}
			}

			pairs.sort(function(l, r) {
				if (l.distance < r.distance) {
					return -1;
				}
				else if (l.distance > r.distance) {
					return 1;
				}
				return 0;
			});

			// In theory the first [lss.length - 1] array items are the best
			// (start, end) points.  This still doesn't provide us order in which
			// to combine.  We start at the beginning and stitch until we have hit
			// all N segments.

			// This builds a doubly linked list where each node has a neighbor
			// reference but not yet a next/prev as we don't know where the
			// head and tail of the list are yet.
			//
			console.log("Building linked list of best candidates.")

			for (var index = 0 ; index < lss.length - 1 ; index++) {
				var pair = pairs[index];
				var ls1 = pair.p1.string;
				var ls2 = pair.p2.string;
				assert(ls1 != ls2, "Pairs are actually start/end of same string");

				//ls1.__near.push({point:pair.p1, string:ls2});
				ls1.__near.push(pair.p2);
				if (ls1.__near.length > 1) {
					lineStringCopy.splice(lineStringCopy.indexOf(ls1), 1);
				}

				ls2.__near.push(pair.p1)
				if (ls2.__near.length > 1) {
					lineStringCopy.splice(lineStringCopy.indexOf(ls2), 1);
				}
			}

			// Establish the next/prev pointers in the list by walking from start
			// to finish.

			assert(lineStringCopy.length == 2, "Didn't find logical start/end.")
			var first = lineStringCopy[0], last = lineStringCopy[1]
			var node = first;
			var prev = null;

			console.log("Orienting tracks...")
			console.log("First : " + first.getPlaceMarkName())
			console.log("Last : " + last.getPlaceMarkName())

			while (node) {
				if (node.__near[0].string == prev) {
					node.__next = node.__near[1];
					node.__prev = node.__near[0];
				}
				else {
					node.__next = node.__near[0];
					node.__prev = node.__near[1];
				}

				prev = node;
				node = node.__next ? node.__next.string : null;
			}

			// Now we walk the list, ordering the strings in the direciton we're
			// moving and build the final combined string.

			console.log("Creating combined track...")

			var newLineString = new LineString()
			node = first;

			while (node) {
				var nextString = node.__next ? node.__next.string : null;
				var prevString = node.__prev ? node.__prev.string : null

				console.log("-->" + node.getPlaceMarkName())

				if (node.__prev == null) {
					assert(node.getEndPoint().isEqual(nextString.__prev.point) || node.getStartPoint().isEqual(nextString.__prev.point))
					// Head of list, orient towards the next string
					if (!node.getEndPoint().isEqual(nextString.__prev.point)) {
						console.log("  reversing...")
						node.reverse();
					}
				}
				else {
					// Previous string points in the direction we want to go
					if (!node.getStartPoint().isEqual(prevString.__next.point)) {
						console.log("  reversing...")
						node.reverse();
					}
				}

				newLineString.concat(node);
				node = nextString;
			}

			// Now create a new placemark, replacing the first with our segment and

			var placemark = lss[0].parentNode
			var newSegment = placemark.cloneNode(true)
			var oldName = $("name", newSegment).text();
			$("name", newSegment).text(oldName + " (COMBINED)");
			placemark.parentNode.insertBefore(newSegment, placemark.nextSibling);
			$(newSegment).find("coordinates").text(newLineString.toXMLString());

			ctx.save(kml);
		}
		else {
			alert("KMLs must have a single linestring each.");
		}
	}

	static showOnMap(ctx) {
		var kml = ctx.getKML();
		var distance = ctx.getInteger(2);

		// Find the 1st linesting, should only be one.
		var lss = $(kml).find("Placemark LineString");

		lss.each(function(index, lsNode) {
			var pathCoordinates = [];
			var bounds = new google.maps.LatLngBounds();

			var coordNode = $(lsNode).find("coordinates");
			var lineString = LineString.parseCoordinates(coordNode.text());
			var coords = lineString.coordinates();

			for (var i = 0 ; i < coords.length ; i++) {
				var coord = {lat:coords[i].lat, lng:coords[i].long};
				pathCoordinates.push(coord)
				bounds.extend(coord);
			}

			var polyline = new google.maps.Polyline({
				path: pathCoordinates,
				geodesic: true,
				//editable: true,
				strokeColor: '#FF0000',
				strokeOpacity: 1.0,
				strokeWeight: 2
			});

			polyline.setMap(Helpers.map);
			Helpers.map.fitBounds(bounds);
		});
	}

	static test() {
		LineSegment.test()
		LineString.test_nearestPointTo()
	}
}