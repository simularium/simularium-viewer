import { Vector2, Vector3, Vector4 } from "three";

// THIS TEST MODULE IS A REPLICA/PORT OF THE GLSL SHADER CODE IN
// simularium/rendering/InstancedFiberShader.ts
// AND IS MEANT TO VERIFY SOME EDGE CASES FOR CURVE GENERATION

// verify that T,N,B are non zero vecs and all perp
function allzero(v: Vector3, epsilon = 0.0001): boolean {
    return (
        Math.abs(v.x) < epsilon &&
        Math.abs(v.y) < epsilon &&
        Math.abs(v.z) < epsilon
    );
}

function initCubicPolynomial(x0, x1, t0, t1): Vector4 {
    return new Vector4(
        x0,
        t0,
        -3.0 * x0 + 3.0 * x1 - 2.0 * t0 - t1,
        2.0 * x0 - 2.0 * x1 + t0 + t1
    );
}
function calcCubicPolynomial(t: number, c: Vector4): number {
    const t2 = t * t;
    const t3 = t2 * t;
    return c.x + c.y * t + c.z * t2 + c.w * t3;
}
function initNonuniformCatmullRom(x0, x1, x2, x3, dt0, dt1, dt2): Vector4 {
    // compute tangents when parameterized in [t1,t2]
    let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
    let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;

    // rescale tangents for parametrization in [0,1]
    t1 *= dt1;
    t2 *= dt1;

    return initCubicPolynomial(x1, x2, t1, t2);
}

function sampleCurve(t: number, points: Vector3[]): Vector3 {
    let point = new Vector3(0, 0, 0);

    const l = points.length;

    const p = (l - 1) * t;
    let intPoint = Math.floor(p);
    let weight = p - intPoint;

    if (weight == 0.0 && intPoint == l - 1) {
        intPoint = l - 2;
        weight = 1.0;
    }

    let p0: Vector3 = new Vector3(),
        p3: Vector3 = new Vector3(); // 4 points (p1 & p2 defined below)

    if (intPoint > 0) {
        p0 = new Vector3().copy(points[(intPoint - 1) % l]);
    } else {
        // extrapolate first point
        //tmp.subVectors( points[ 0 ], points[ 1 ] ).add( points[ 0 ] );
        p0 = new Vector3().copy(points[0]).add(points[0]).sub(points[0]); //(points[0]-points[1]) + points[0];
    }

    const p1 = new Vector3().copy(points[intPoint % l]);
    const p2 = new Vector3().copy(points[(intPoint + 1) % l]);

    if (intPoint + 2 < l) {
        p3 = new Vector3().copy(points[(intPoint + 2) % l]);
    } else {
        // extrapolate last point
        //tmp.subVectors( points[ l - 1 ], points[ l - 2 ] ).add( points[ l - 1 ] );
        p3 = new Vector3()
            .copy(points[l - 1])
            .add(points[l - 1])
            .sub(points[l - 2]); //(points[l-1]-points[l-2])+points[l-1];
    }

    // // init Centripetal / Chordal Catmull-Rom
    const exponent = 0.25;
    let dt0 = p0.distanceToSquared(p1);
    let dt1 = p1.distanceToSquared(p2);
    let dt2 = p2.distanceToSquared(p3);
    dt0 = Math.pow(dt0, exponent);
    dt1 = Math.pow(dt1, exponent);
    dt2 = Math.pow(dt2, exponent);

    // safety check for repeated points
    if (dt1 < 1e-4) dt1 = 1.0;
    if (dt0 < 1e-4) dt0 = dt1;
    if (dt2 < 1e-4) dt2 = dt1;

    const px = initNonuniformCatmullRom(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2);
    const py = initNonuniformCatmullRom(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2);
    const pz = initNonuniformCatmullRom(p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2);

    point = new Vector3(
        calcCubicPolynomial(weight, px),
        calcCubicPolynomial(weight, py),
        calcCubicPolynomial(weight, pz)
    );
    return point;
}

// ------
// Fast version; computes the local Frenet-Serret frame
// ------
function createTube(
    points: Vector3[],
    t: number,
    angle: number,
    volume: Vector2,
    offset: Vector3,
    normal: Vector3,
    T: Vector3,
    B: Vector3,
    N: Vector3
) {
    // find prev and next sample along curve

    const delta = 0.0001;
    const t1 = Math.max(t - delta, 0.0);
    const t2 = Math.min(t + delta, 1.0);

    // sample the curve in two places
    const prev = sampleCurve(t1, points);
    const next = sampleCurve(t2, points);
    // console.log("prev=", prev);
    // console.log("next=", next);

    // compute the TBN matrix
    T.copy(new Vector3().copy(next).sub(prev).normalize());
    // if (next-prev) and (next+prev) are parallel, then B will be zero
    const check = new Vector3()
        .copy(next)
        .sub(prev)
        .dot(new Vector3().copy(next).add(prev));
    if (check > 0.00001) {
        B.copy(
            new Vector3().copy(next).add(prev).normalize().cross(T).normalize()
        );
    } else {
        // special case for which N ad B are not well defined.
        // so we will just pick something
        let min = 1.0;
        if (T.x <= min) {
            min = T.x;
            B.x = 1.0;
        }
        if (T.y <= min) {
            min = T.y;
            B.y = 1.0;
        }
        if (T.z <= min) {
            B.z = 1.0;
        }
        const tmpVec = new Vector3().copy(T).cross(B).normalize();
        B.copy(new Vector3().copy(T).cross(tmpVec).normalize()); // = normalize(cross(T, tmpVec));
    }

    N.copy(new Vector3().copy(T).cross(B)); //-normalize(cross(B, T));

    // extrude outward to create a tube
    const tubeAngle = angle;
    const circX = Math.cos(tubeAngle);
    const circY = Math.sin(tubeAngle);

    // compute position and normal
    const bx = new Vector3().copy(B).multiplyScalar(circX);
    const ny = new Vector3().copy(N).multiplyScalar(circY);
    normal.copy(new Vector3().copy(bx).add(ny).normalize()); //xyz = normalize(B * circX + N * circY);
    offset.copy(
        sampleCurve(t, points)
            .add(bx.multiplyScalar(volume.x))
            .add(ny.multiplyScalar(volume.y))
    ); //.xyz = sampleCurve(t) + B * volume.x * circX + N * volume.y * circY;
}

function walkCurve(points) {
    // angle is a radial angle around the oriented cylinder centered at the point on the curve
    const angle = 0;
    // volume is just a radius scale factor
    const volume = new Vector2(1, 1);

    // outputs:

    // pt and normal on the tube centered on our curve:
    const transformed = new Vector3();
    const objectNormal = new Vector3();
    // Frenet-Serret frame around this pt on the curve:
    // tangent, binormal, normal
    const T = new Vector3();
    const B = new Vector3();
    const N = new Vector3();
    // walk along whole curve
    const nsteps = 8;
    for (let t = 0; t < 1.0; t += 1.0 / nsteps) {
        createTube(
            points,
            t,
            angle,
            volume,
            transformed,
            objectNormal,
            T,
            B,
            N
        );

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

describe("Test curve", () => {
    test("on-axis curve computes valid positions", () => {
        const points: Vector3[] = [
            new Vector3(-70, 0, 0),
            new Vector3(10, 0, 0),
        ];
        walkCurve(points);
    });
    test("very short curve computes valid positions", () => {
        const points: Vector3[] = [
            new Vector3(0.8003046890483816, -0.0012372934219477827, 0.0),
            new Vector3(-0.7998676465812267, 0.0016908162423625583, 0.0),
        ];
        walkCurve(points);
    });
});
