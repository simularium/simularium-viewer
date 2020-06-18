interface Extent {
    min: number;
    max: number;
}

interface KMeansOptions {
    k: number;
    data: number[][];
}

function findMin(arr) {
    let m = Number.MAX_VALUE;
    for (let i = 0; i < arr.length; ++i) {
        if (arr[i] < m) {
            m = arr[i];
        }
    }
    return m;

    //    return Math.min.apply(null, arr);
}

/**
 * fillArray
 * @desc Returns a prefilled array.
 * @param {number} length - length of array
 * @param {*} value - value to prefill with.
 * @return array with prefilled values.
 */
function fillArray(length, val) {
    return Array.apply(null, Array(length)).map(function() {
        return val;
    });
}

/**
 * KMeans
 * @constructor
 * @desc KMeans constructor
 * @param {object} options - options object
 * @param {array} options.data - data array with points
 * @param {number} options.k - number of cluster centroids
 * @return array with arrays of points
 */
export default class KMeans {
    public k: number;
    public data: any;
    public assignments: any;
    public extents: any;
    public ranges: any;
    public means: any;
    public iterations: number;
    public drawDelay: number;
    public timer: number;
    private distances: number[];

    public constructor(opts: KMeansOptions) {
        // Number of cluster centroids.
        this.k = opts.k;

        // Points to cluster.
        this.data = opts.data;

        // Keeps track of which cluster centroid index each data point belongs to.
        this.assignments = [];
        // temp holds distance of points to mean during iteration
        this.distances = [];

        // Get the extents (min,max) for the dimensions.
        this.extents = this.dataDimensionExtents(this.data);

        // Get the range of the dimensions.
        this.ranges = this.dataExtentRanges();

        // Generate random cluster centroid points.
        this.means = this.seeds();

        // Keep track of number of times centroids move.
        this.iterations = 0;

        // Delay for each draw iteration.
        this.drawDelay = 1;

        // Perform work.
        this.timer = -1;
        this.run();
    }

    /**
     * dataDimensionExtents
     * @desc Returns the the minimum and maximum values for each dimention in the data array.
     * @param {array} data - data containing points
     * @return {array} extents - extents for each dimenion
     * @example
     * kmeans.data = [
     *   [2,5],
     *   [4,7],
     *   [3,1]
     * ];
     * var extents = kmeans.dataDimensionExtents();
     * console.log(extents); // [{min: 2, max: 4}, {min: 1, max: 7}]
     */

    public dataDimensionExtents(data) {
        data = data || this.data;
        var extents: Extent[] = [];

        for (var i = 0; i < data.length; i++) {
            var point = data[i];

            for (var j = 0; j < point.length; j++) {
                if (!extents[j]) {
                    extents[j] = { min: 1000, max: 0 };
                }

                if (point[j] < extents[j].min) {
                    extents[j].min = point[j];
                }

                if (point[j] > extents[j].max) {
                    extents[j].max = point[j];
                }
            }
        }

        return extents;
    }

    /**
     * dataExtentRanges
     * @desc Returns the range for each extent
     * @return {array} ranges
     * kmeans.extents = [{min: 2, max: 4}, {min: 1, max: 7}]
     * var ranges = kmeans.dataExtentRanges(extents);
     * console.log(ranges); // [2,6]
     */
    public dataExtentRanges() {
        var ranges: number[] = [];

        for (var i = 0; i < this.extents.length; i++) {
            ranges[i] = this.extents[i].max - this.extents[i].min;
        }

        return ranges;
    }

    /**
     * seeds
     * @desc Returns an array of randomly generated cluster centroid points bounds based on the data dimension ranges.
     * @return {array} cluster centroid points
     * @example
     * var means = kmeans.seeds();
     * console.log(means); // [[2,3],[4,5],[5,2]]
     */
    public seeds() {
        var means: number[][] = [];
        while (this.k--) {
            var mean: number[] = [];

            for (var i = 0; i < this.extents.length; i++) {
                mean[i] = this.extents[i].min + Math.random() * this.ranges[i];
            }

            means.push(mean);
        }

        return means;
    }

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
    public assignClusterToDataPoints() {
        //var assignments: number[] = [];

        for (var i = 0; i < this.data.length; i++) {
            var point = this.data[i];
            //var distances: number[] = [];

            for (var j = 0; j < this.means.length; j++) {
                var mean = this.means[j];
                var sum = 0;

                /* We calculate the Euclidean distance.
                 * √((pi-qi)^2+...+(pn-qn)^2)
                 */

                for (var dim = 0; dim < point.length; dim++) {
                    // dif = (pn - qn)
                    var difference = point[dim] - mean[dim];

                    // dif = (dif)^2
                    difference = Math.pow(difference, 2);

                    // sum = (difi) + ... + (difn)
                    sum += difference;
                }

                // √sum
                this.distances[j] = Math.sqrt(sum);
            }

            // After calculating all the distances from the data point to each cluster centroid,
            // we pick the closest (smallest) distances.
            this.assignments[i] = this.distances.indexOf(
                findMin(this.distances)
            );
        }

        //return assignments;
    }

    /**
     * moveMeans
     * @desc Update the positions of the the cluster centroids (means) to the average positions
     * of all data points that belong to that mean.
     */
    public moveMeans() {
        var sums = fillArray(this.means.length, 0);
        var counts = fillArray(this.means.length, 0);
        var moved = false;
        var i;
        var meanIndex;
        var dim;

        // Clear location sums for each dimension.
        for (i = 0; i < this.means.length; i++) {
            sums[i] = fillArray(this.means[i].length, 0);
        }

        // For each cluster, get sum of point coordinates in every dimension.
        for (
            var pointIndex = 0;
            pointIndex < this.assignments.length;
            pointIndex++
        ) {
            meanIndex = this.assignments[pointIndex];
            var point = this.data[pointIndex];
            var mean = this.means[meanIndex];

            counts[meanIndex]++;

            for (dim = 0; dim < mean.length; dim++) {
                sums[meanIndex][dim] += point[dim];
            }
        }

        /* If cluster centroid (mean) is not longer assigned to any points,
         * move it somewhere else randomly within range of points.
         */
        for (meanIndex = 0; meanIndex < sums.length; meanIndex++) {
            if (0 === counts[meanIndex]) {
                sums[meanIndex] = this.means[meanIndex];

                for (dim = 0; dim < this.extents.length; dim++) {
                    sums[meanIndex][dim] =
                        this.extents[dim].min +
                        Math.random() * this.ranges[dim];
                }
                continue;
            }

            for (dim = 0; dim < sums[meanIndex].length; dim++) {
                sums[meanIndex][dim] /= counts[meanIndex];
                sums[meanIndex][dim] =
                    Math.round(100 * sums[meanIndex][dim]) / 100;
            }
        }

        /* If current means does not equal to new means, then
         * move cluster centroid closer to average point.
         */
        if (this.means.toString() !== sums.toString()) {
            var diff;
            moved = true;

            // Nudge means 1/nth of the way toward average point.
            for (meanIndex = 0; meanIndex < sums.length; meanIndex++) {
                for (dim = 0; dim < sums[meanIndex].length; dim++) {
                    diff = sums[meanIndex][dim] - this.means[meanIndex][dim];
                    if (Math.abs(diff) > 0.1) {
                        var stepsPerIteration = 10;
                        this.means[meanIndex][dim] += diff / stepsPerIteration;
                        this.means[meanIndex][dim] =
                            Math.round(100 * this.means[meanIndex][dim]) / 100;
                    } else {
                        this.means[meanIndex][dim] = sums[meanIndex][dim];
                    }
                }
            }
        }

        return moved;
    }

    /**
     * run
     * @desc Reassigns nearest cluster centroids (means) to data points,
     * and checks if cluster centroids (means) have moved, otherwise
     * end program.
     */
    public run() {
        console.time("kmeans");
        let meansMoved = true;
        const maxIterations = 300;
        do {
            ++this.iterations;

            // Reassign points to nearest cluster centroids.
            this.assignClusterToDataPoints();

            // Returns true if the cluster centroids have moved location since the last iteration.
            meansMoved = this.moveMeans();
        } while (meansMoved && this.iterations < maxIterations);
        console.timeEnd("kmeans");
        console.log("Iteration took for completion: " + this.iterations);

        // while (meansMoved) {
        //     ++this.iterations;
        //     // Reassign points to nearest cluster centroids.
        //     this.assignments = this.assignClusterToDataPoints();

        //     // Returns true if the cluster centroids have moved location since the last iteration.
        //     meansMoved = this.moveMeans();
        // }

        // /* If cluster centroids moved then
        //  *rerun to reassign points to new cluster centroid (means) positions.
        //  */
        // if (meansMoved) {
        //     this.timer = setTimeout(this.run.bind(this), this.drawDelay);
        // } else {
        //     // Otherwise task has completed.
        //     console.log("Iteration took for completion: " + this.iterations);
        // }
    }
}
