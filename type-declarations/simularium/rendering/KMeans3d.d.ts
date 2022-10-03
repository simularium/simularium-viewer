interface KMeansOptions {
    k: number;
    data: Float32Array;
}
/**
 * KMeans
 *       This is a ported and optimized version of code explained here:
 *       https://miguelmota.com/blog/k-means-clustering-in-javascript/
 *       https://burakkanber.com/blog/machine-learning-k-means-clustering-in-javascript-part-1/
 *
 * @constructor
 * @desc KMeans constructor
 * @param {object} options - options object
 * @param {array} options.data - data array with points
 * @param {number} options.k - number of cluster centroids
 * @return array with arrays of points
 */
export default class KMeans {
    k: number;
    data: Float32Array;
    assignments: Int32Array;
    extents: number[];
    ranges: number[];
    means: Float32Array;
    iterations: number;
    drawDelay: number;
    timer: number;
    private tmpDistances;
    constructor(opts: KMeansOptions);
    /**
     * dataDimensionExtents
     * @desc Returns the the minimum and maximum values for each dimention in the data array.
     * @param {array} data - data containing points
     * @return {array} extents - min and max extents minx,miny,minz,maxx,maxy,maxz
     * @example
     * kmeans.data = [
     *   2,5,1,
     *   4,7,2,
     *   3,1,3
     * ];
     * var extents = kmeans.dataDimensionExtents();
     * console.log(extents); // [2,1,1, 4,7,3]
     */
    dataDimensionExtents(data: Float32Array): number[];
    /**
     * dataExtentRanges
     * @desc Returns the range for each extent
     * @return {array} ranges
     * kmeans.extents = [minx,miny.minz,maxx,maxy,maxz]
     * var ranges = kmeans.dataExtentRanges(extents);
     * console.log(ranges); // [2,6]
     */
    dataExtentRanges(): number[];
    /**
     * seeds
     * @desc Returns an array of randomly generated cluster centroid points bounds based on the data dimension ranges.
     * @return {array} cluster centroid points
     * @example
     * var means = kmeans.seeds();
     * console.log(means); // [2,3,7, 4,5,2, 5,2,1]
     */
    seeds(): Float32Array;
    static randomSeeds(k: number, data: Float32Array): Float32Array;
    /**
     * assignClusterToDataPoints
     * @desc Calculate Euclidean distance between each point and the cluster center.
     * Assigns each point to closest mean point.
     *
     * The distance between two points is the length of the path connecting them.
     * The distance between points P(p1,p2) and Q(q1,q2) is given by the Pythagorean theorem.
     *
     * distance = square root of ((p1 - q1)^2 + (p2 - q2)^2)
     *
     * For n dimensions, ie P(p1,p2,pn) and Q(q1,q2,qn).
     * d(p,q) = square root of ((p1 - q1)^2 + (p2 - q2)^2 + ... + (pn - qn)^2)
     *
     * http://en.wikipedia.org/wiki/Euclidean_distance
     */
    assignClusterToDataPoints(): void;
    /**
     * moveMeans
     * @desc Update the positions of the the cluster centroids (means) to the average positions
     * of all data points that belong to that mean.
     */
    moveMeans(): boolean;
    /**
     * run
     * @desc Reassigns nearest cluster centroids (means) to data points,
     * and checks if cluster centroids (means) have moved, otherwise
     * end program.
     */
    run(): void;
}
export {};
