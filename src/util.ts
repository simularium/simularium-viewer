// TODO: Put precisionFactor as global constant
export const compareFloats = (
    number1: number,
    number2: number,
    precisionRef: number,
    precisionFactor = 1
): number => {
    /*
    Compares 2 numbers by using an epsilon padding to bypass any floating point precision issues.

    Params:
        number1:            Any number
        number2:            Any number
        precisionRef:       A reference number to use for precision, e.g. a time step size if
                            you're comparing 2 time values in a time series
        precisionFactor:    precisionRef will be multiplied by this number to determine epsilon,
                            e.g., 0.01 to use 1/100 of a time step size as epsilon

    Returns:
        1 if number1 > number2
        -1 if number1 < number2
        0 if number1 ~= number2
    */

    const epsilon = precisionRef * precisionFactor;
    if (number1 - epsilon > number2) return 1;
    if (number1 + epsilon < number2) return -1;
    return 0;
};
