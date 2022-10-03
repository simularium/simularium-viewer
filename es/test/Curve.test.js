import { Vector2, Vector3, Vector4 } from "three"; // THIS TEST MODULE IS A REPLICA/PORT OF THE GLSL SHADER CODE IN
// simularium/rendering/InstancedFiberShader.ts
// AND IS MEANT TO VERIFY SOME EDGE CASES FOR CURVE GENERATION
// verify that T,N,B are non zero vecs and all perp

function allzero(v) {
  var epsilon = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.0001;
  return Math.abs(v.x) < epsilon && Math.abs(v.y) < epsilon && Math.abs(v.z) < epsilon;
}

function initCubicPolynomial(x0, x1, t0, t1) {
  return new Vector4(x0, t0, -3.0 * x0 + 3.0 * x1 - 2.0 * t0 - t1, 2.0 * x0 - 2.0 * x1 + t0 + t1);
}

function calcCubicPolynomial(t, c) {
  var t2 = t * t;
  var t3 = t2 * t;
  return c.x + c.y * t + c.z * t2 + c.w * t3;
}

function initNonuniformCatmullRom(x0, x1, x2, x3, dt0, dt1, dt2) {
  // compute tangents when parameterized in [t1,t2]
  var t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
  var t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2; // rescale tangents for parametrization in [0,1]

  t1 *= dt1;
  t2 *= dt1;
  return initCubicPolynomial(x1, x2, t1, t2);
}

function sampleCurve(t, points) {
  var point = new Vector3(0, 0, 0);
  var l = points.length;
  var p = (l - 1) * t;
  var intPoint = Math.floor(p);
  var weight = p - intPoint;

  if (weight == 0.0 && intPoint == l - 1) {
    intPoint = l - 2;
    weight = 1.0;
  }

  var p0 = new Vector3(),
      p3 = new Vector3(); // 4 points (p1 & p2 defined below)

  if (intPoint > 0) {
    p0 = new Vector3().copy(points[(intPoint - 1) % l]);
  } else {
    // extrapolate first point
    //tmp.subVectors( points[ 0 ], points[ 1 ] ).add( points[ 0 ] );
    p0 = new Vector3().copy(points[0]).add(points[0]).sub(points[0]); //(points[0]-points[1]) + points[0];
  }

  var p1 = new Vector3().copy(points[intPoint % l]);
  var p2 = new Vector3().copy(points[(intPoint + 1) % l]);

  if (intPoint + 2 < l) {
    p3 = new Vector3().copy(points[(intPoint + 2) % l]);
  } else {
    // extrapolate last point
    //tmp.subVectors( points[ l - 1 ], points[ l - 2 ] ).add( points[ l - 1 ] );
    p3 = new Vector3().copy(points[l - 1]).add(points[l - 1]).sub(points[l - 2]); //(points[l-1]-points[l-2])+points[l-1];
  } // // init Centripetal / Chordal Catmull-Rom


  var exponent = 0.25;
  var dt0 = p0.distanceToSquared(p1);
  var dt1 = p1.distanceToSquared(p2);
  var dt2 = p2.distanceToSquared(p3);
  dt0 = Math.pow(dt0, exponent);
  dt1 = Math.pow(dt1, exponent);
  dt2 = Math.pow(dt2, exponent); // safety check for repeated points

  if (dt1 < 1e-4) dt1 = 1.0;
  if (dt0 < 1e-4) dt0 = dt1;
  if (dt2 < 1e-4) dt2 = dt1;
  var px = initNonuniformCatmullRom(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2);
  var py = initNonuniformCatmullRom(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2);
  var pz = initNonuniformCatmullRom(p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2);
  point = new Vector3(calcCubicPolynomial(weight, px), calcCubicPolynomial(weight, py), calcCubicPolynomial(weight, pz));
  return point;
} // ------
// Fast version; computes the local Frenet-Serret frame
// ------


function createTube(points, t, angle, volume, offset, normal, vT, vB, vN) {
  // find prev and next sample along curve
  var delta = 0.0001;
  var t1 = Math.max(t - delta, 0.0);
  var t2 = Math.min(t + delta, 1.0); // sample the curve in two places

  var prev = sampleCurve(t1, points);
  var next = sampleCurve(t2, points); // compute the TBN matrix (aka the Frenet-Serret frame)
  // tangent is just the direction along our small delta

  vT.copy(new Vector3().copy(next).sub(prev).normalize()); // if next-prev and next+prev are parallel, then
  // our normal and binormal will be ill-defined so we need to check for that
  // check parallel by dot the unit vectors and check close to +/-1

  var check = new Vector3().copy(vT).dot(new Vector3().copy(next).add(prev).normalize());

  if (Math.abs(check) < 0.999) {
    // cross product of parallel vectors is 0, so T must not be parallel to next+prev
    // hence the above check.
    vB.copy(new Vector3().copy(next).add(prev).normalize().cross(vT).normalize());
  } else {
    // special case for which N and B are not well defined.
    // so we will just pick something
    var min = 1.0;

    if (Math.abs(vT.x) <= min) {
      min = Math.abs(vT.x);
      vB.x = 1.0;
    }

    if (Math.abs(vT.y) <= min) {
      min = Math.abs(vT.y);
      vB.y = 1.0;
    }

    if (Math.abs(vT.z) <= min) {
      vB.z = 1.0;
    }

    var tmpVec = new Vector3().copy(vT).cross(vB).normalize();
    vB.copy(new Vector3().copy(vT).cross(tmpVec).normalize()); // = normalize(cross(T, tmpVec));
  }

  vN.copy(new Vector3().copy(vT).cross(vB)); //-normalize(cross(B, T));
  // extrude outward to create a tube

  var tubeAngle = angle;
  var circX = Math.cos(tubeAngle);
  var circY = Math.sin(tubeAngle); // compute position and normal

  var bx = new Vector3().copy(vB).multiplyScalar(circX);
  var ny = new Vector3().copy(vN).multiplyScalar(circY);
  normal.copy(new Vector3().copy(bx).add(ny).normalize()); //xyz = normalize(B * circX + N * circY);

  offset.copy(sampleCurve(t, points).add(bx.multiplyScalar(volume.x)).add(ny.multiplyScalar(volume.y))); //.xyz = sampleCurve(t) + B * volume.x * circX + N * volume.y * circY;
}

function walkCurve(points) {
  // angle is a radial angle around the oriented cylinder centered at the point on the curve
  var angle = 0; // volume is just a radius scale factor

  var volume = new Vector2(1, 1); // outputs:
  // pt and normal on the tube centered on our curve:

  var transformed = new Vector3();
  var objectNormal = new Vector3(); // Frenet-Serret frame around this pt on the curve:
  // tangent, binormal, normal

  var T = new Vector3();
  var B = new Vector3();
  var N = new Vector3(); // walk along whole curve

  var nsteps = 8;

  for (var t = 0; t < 1.0; t += 1.0 / nsteps) {
    createTube(points, t, angle, volume, transformed, objectNormal, T, B, N);
    expect(allzero(T)).toBe(false);
    expect(allzero(B)).toBe(false);
    expect(allzero(N)).toBe(false);
    expect(T.length()).not.toBeCloseTo(0);
    expect(B.length()).not.toBeCloseTo(0);
    expect(N.length()).not.toBeCloseTo(0);
    expect(T.dot(B)).toBeCloseTo(0);
    expect(T.dot(N)).toBeCloseTo(0);
    expect(N.dot(B)).toBeCloseTo(0);
  }
}

describe("Test curve", function () {
  test("on-axis curve computes valid positions", function () {
    var points = [new Vector3(-70, 0, 0), new Vector3(10, 0, 0)];
    walkCurve(points);
  });
  test("on-axis curve computes valid positions", function () {
    var points = [new Vector3(10, 0, 0), new Vector3(-70, 0, 0)];
    walkCurve(points);
  });
  test("very short curve computes valid positions", function () {
    var points = [new Vector3(0.8003046890483816, -0.0012372934219477827, 0.0), new Vector3(-0.7998676465812267, 0.0016908162423625583, 0.0)];
    walkCurve(points);
  });
});