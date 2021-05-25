export const compareTimes = (
    time1: number,
    time2: number,
    timeStepSize: number,
    stepSizeFraction = 0.01
): number => {
    /*
    Compares two time values in a series by seeing whether they are within some
    small fraction of the time step size.

    Params:
        time1:          Any number
        time2:          Any number
        timeStepSize:   The step size in a time series

    Returns:
        1 if time1 > time2
        -1 if time1 < time2
        0 if time1 ~= time2
    */

    const epsilon = timeStepSize * stepSizeFraction;
    if (time1 - epsilon > time2) return 1;
    if (time1 + epsilon < time2) return -1;
    return 0;
};
