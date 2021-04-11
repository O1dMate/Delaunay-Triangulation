const totalPoints = 400;
const MOVE_SPEED = 0.25;
// const MOVE_SPEED = 2;
const POINT_RADIUS = 5;

let SCREEN_WIDTH = 0;
let SCREEN_HEIGHT = 0;

let POINT_LIST = [];

const drawRect = (x, y, w, h) => rect(x, SCREEN_HEIGHT-y, w, h);
const drawLine = (x1, y1, x2, y2) => line(x1, SCREEN_HEIGHT-y1, x2, SCREEN_HEIGHT-y2);
const drawCircle = (x, y, d) => circle(x, SCREEN_HEIGHT-y, d);
const drawArc = (x, y, w, h, startAngle, stopAngle) => arc(x, SCREEN_HEIGHT-y, w, h, 2*Math.PI-stopAngle, 2*Math.PI-startAngle);
const drawTri = (x1, y1, x2, y2, x3, y3) => triangle(x1, SCREEN_HEIGHT-y1, x2, SCREEN_HEIGHT-y2, x3, SCREEN_HEIGHT-y3);

// Initial Setup
function setup() {
	SCREEN_WIDTH = window.innerWidth - 20;
	SCREEN_HEIGHT = window.innerHeight - 20

	createCanvas(window.innerWidth-20, window.innerHeight-20);

	for (let i = 0; i < totalPoints; i++) {
		POINT_LIST.push(new Point(SCREEN_WIDTH, SCREEN_HEIGHT, i));
	}

	frameRate(30);
}

function draw() {
	// Draw background & set Rectangle draw mode
	background(255);
	rectMode(CENTER);

	// Draw scene rectangle
	fill(30,30,30);
	stroke(255,255,255);
	drawRect(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT)

	fill(255,255,255,80);

	BowyerWatson();

	// Draw the Points of top of Everything
	POINT_LIST.forEach(currentPoint => {
		drawPoint(currentPoint);
		currentPoint.update();
	});
}

const BowyerWatson = () => {
	let superTri = superTriangle();

	let triangulation = [];

	triangulation.push(superTri);

	POINT_LIST.forEach(point => {
		let badTriangles = [];

		triangulation.forEach(triangle => {
			if (triangle.circumcircleContains(point)) {
				badTriangles.push(triangle);
			}
		});

		let polygons = [];

		badTriangles.forEach(triangle => {
			triangle.getEdges().forEach(edge => {
				// edge = Array of 2 points
				let badTrianglesThatShareEdge = badTriangles.filter(badTri => badTri.containsEdge(edge[0], edge[1])).filter(badTri => badTri.id !== triangle.id);

				if (badTrianglesThatShareEdge.length === 0) {
					polygons.push(edge);
				}
			});
		});

		// IDs to remove
		let idsToRemove = {}
		badTriangles.forEach(triangle => {
			idsToRemove[triangle.id] = true;
		});
		triangulation = triangulation.filter(triangle => !idsToRemove.hasOwnProperty(triangle.id));

		polygons.forEach(edge => {
			triangulation.push(new Triangle(edge[0], edge[1], point));
		})
	});

	triangulation = triangulation.filter(triangle => !triangle.triangleContainsVertex(-1) && !triangle.triangleContainsVertex(-2) && !triangle.triangleContainsVertex(-3));

	triangulation.forEach(triangle => {
		drawTriangle(triangle);
	})
}


const superTriangle = () => {
	let minx = Infinity;
	let miny = Infinity;
	let maxx = -Infinity;
	let maxy = -Infinity;

	POINT_LIST.forEach(point => {
		minx = Math.min(minx, point.position.x);
		miny = Math.min(miny, point.position.y);
		maxx = Math.max(maxx, point.position.x);
		maxy = Math.max(maxy, point.position.y);
	});

	let dx = (maxx - minx) * 10;
	let dy = (maxy - miny) * 10;

	return new Triangle(
		{id: -1, position: {x: minx-dx, y: miny-dy*3}},
		{id: -2, position: {x: minx-dx, y: maxy+dy}},
		{id: -3, position: {x: maxx+dx, y: maxy+dy}}
	);
}

const drawTriangle = (triangleObject) => {
	let vertices = Object.values(triangleObject.vertices);
	let averageHeight = (vertices[0].position.y + vertices[1].position.y + vertices[2].position.y) / 3;
	let outputColor = map(averageHeight, -200, SCREEN_HEIGHT+200, -20, 340);

	colorMode(HSB, 360, 100, 100);
	fill(outputColor, 100, 100);
	colorMode(RGB, 255);
	stroke(180, 180, 180);
	drawTri(vertices[0].position.x, vertices[0].position.y, vertices[1].position.x, vertices[1].position.y, vertices[2].position.x, vertices[2].position.y);
	noFill();
}

const drawPoint = (pointObject) => {
	stroke(30,30,30);
	fill(30,30,30);
	drawCircle(pointObject.position.x, pointObject.position.y, pointObject.radius);
}

const drawLineBetweenThreePoints = (p1, p2, p3) => {
	stroke(0, 255, 0);
	drawLine(p1.position.x, p1.position.y, p2.position.x, p2.position.y);
	drawLine(p2.position.x, p2.position.y, p3.position.x, p3.position.y);
	drawLine(p3.position.x, p3.position.y, p1.position.x, p1.position.y);
}


const drawLineToNearby = (pointObject) => {
	stroke(30,210,230);

	getListOfPointsInFov(pointObject).forEach(point => {
		drawLine(pointObject.position.x, pointObject.position.y, point.position.x, point.position.y);
	})
}


const findClosestPointToPoint = (targetPoint, pointList) => {
	let minPointIndex = 0;
	let minDist = 100000000;

	pointList.forEach((currentPoint, currentIndex) => {
		let dist = distanceBetweenPoints(targetPoint, currentPoint);

		if (dist < minDist) {
			minDist = dist;
			minPointIndex = currentIndex;
		}
	})
	
	return pointList[minPointIndex];
}

const distanceBetweenPoints = (pointA, pointB) => {
	return Math.sqrt(Math.pow(pointA.position.x - pointB.position.x, 2) + Math.pow(pointA.position.y - pointB.position.y, 2));
}

class Point {
	constructor(backgroundSizeX, backgroundSizeY, id) {
		// Store basic properties
		this.id = id;
		this.moveSpeed = MOVE_SPEED;
		this.backgroundSize = { x: backgroundSizeX, y: backgroundSizeY };
		this.radius = Math.floor(Math.random() * POINT_RADIUS + 5);

		// Generate the starting position
		let xPos = Math.floor(Math.random() * (this.backgroundSize.x - 1 + 800)) - 400;
		let yPos = Math.floor(Math.random() * (this.backgroundSize.y - 1 + 400)) - 200;

		// Generate random starting direction
		let xDir = -1 + Math.random()*2;
		let yDir = -1 + Math.random()*2;
		
		// Normalize direction
		let length = Math.sqrt(xDir**2 + yDir**2);

		// Store starting values
		this.position = {x: xPos, y: yPos};
		this.direction = {x: xDir/length, y: yDir/length};
	}

	update() {
		// Update the position of the object
		this.position.x += this.direction.x * this.moveSpeed;
		this.position.y += this.direction.y * this.moveSpeed;

		// Handle going off the left & right sides
		if (this.position.x < -0.5-400) this.position.x += this.backgroundSize.x;
		else if (this.position.x > this.backgroundSize.x+400) this.position.x -= this.backgroundSize.x;

		// Handle going off the top and bottom sides
		if (this.position.y < -0.5-200) this.position.y += this.backgroundSize.y;
		else if (this.position.y > this.backgroundSize.y+200) this.position.y -= this.backgroundSize.y;
	}
}

class Triangle {
	constructor(point1, point2, point3) {
		this.id = Math.round(Math.random() * 1000000000000000);

		// vertexId = pointId
		this.vertices = {
			[point1.id]: point1,
			[point2.id]: point2,
			[point3.id]: point3
		}

		// Algorith from: http://www.ambrsoft.com/TrigoCalc/Circle3D.htm
		let x1 = point1.position.x;
		let y1 = point1.position.y;
		let x2 = point2.position.x;
		let y2 = point2.position.y;
		let x3 = point3.position.x;
		let y3 = point3.position.y;

		let A = x1*(y2-y3) - y1*(x2-x3) + x2*y3 - x3*y2;
		let B = (Math.pow(x1,2)+Math.pow(y1,2))*(y3-y2) + (Math.pow(x2,2)+Math.pow(y2,2))*(y1-y3) + (Math.pow(x3,2)+Math.pow(y3,2))*(y2-y1);
		let C = (Math.pow(x1,2)+Math.pow(y1,2))*(x2-x3) + (Math.pow(x2,2)+Math.pow(y2,2))*(x3-x1) + (Math.pow(x3,2)+Math.pow(y3,2))*(x1-x2);

		let cx = -B / (2*A);
		let cy = -C / (2*A);

		// Algorithm from: https://www.mathopenref.com/trianglecircumcircle.html
		A = distanceBetweenPoints(point1, point2);
		B = distanceBetweenPoints(point2, point3);
		C = distanceBetweenPoints(point3, point1);

		let numerator = A * B * C;
		let denominator = (A+B+C)*(B+C-A)*(C+A-B)*(A+B-C);

		this.circumcircleRadius = numerator / Math.sqrt(denominator);
		this.circumcircleCentrePoint = { position: { x: cx, y: cy } };
	}

	triangleContainsVertex(vertexId) {
		return this.vertices.hasOwnProperty(vertexId)
	}

	circumcircleContains(point) {
		return distanceBetweenPoints(point, this.circumcircleCentrePoint) < this.circumcircleRadius;
	}

	getEdges() {
		let points = Object.values(this.vertices);
		return [[points[0], points[1]], [points[1], points[2]], [points[2], points[0]]];
	}

	containsEdge(point1, point2) {
		return this.vertices.hasOwnProperty(point1.id) && this.vertices.hasOwnProperty(point2.id);
	}
}