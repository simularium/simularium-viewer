class SimParameters {
    constructor(opts) {
        this.mparamList = {};
        this.paramListCache = {};

        this.timeStepSliderVal = opts.timeStepSliderVal || 0;
        this.lastTimeStepSliderVal = opts.lastTimeStepSliderVal || 0;

        this.minimumTimeStep = opts.minimumTimeStep || 0.001;
        this.maximumTimeStep = opts.maximumTimeStep || 1;
        this.timeStepSliderExponent = opts.timeStepSliderExponent || 4;

        this.preRunNumTimeSteps = opts.preRunNumTimeSteps || 1000;
        this.preRunTimeStep = opts.preRunTimeStep || 1e-5;

        this.trajectoryPlaybackFile = opts.trajectoryPlaybackFile || '';
        this.cachePlaybackFrame = opts.cachePlaybackFrame || 0;

        this.gui = null;

        this.mnewSimulationRunning = false;

        this.hasParamUpdates = false;
        this.hasTimeStepUpdates = false;
        this.mguiNeedsUpdate = false;
    }

    get newSimulationRunning() { return this.mnewSimulationIsRunning; }

    set newSimulationRunning(val) { this.mnewSimulationIsRunning = val; }

    get paramList() { return this.mparamList; }

    set paramList(val) { this.mparamList = val; }

    set playBackFile(val) {
        if (this.trajectoryPlaybackFile !== val) {
            this.trajectoryPlaybackFile = val; 
        }
    }

    get guiNeedsUpdate() { return this.mguiNeedsUpdate; }

    set guiNeedsUpdate(val) { this.mguiNeedsUpdate = val; }

    /**
    * Parameter Update Helper Functions
    */
    static linearInterpolate(minimumValue, maximumValue, coefficient) {
        return minimumValue + coefficient * (maximumValue - minimumValue);
    }

    // linearly interpolates between two values using a modified coefficient
    //  the coefficient is modified by the exponent passed
    //  this allows parameters to sweep a wide range of values sensibly (e.g. 1e-15 -> 1e30)
    //  with small increases at the low end and large increases at the higher end
    static exponentialSlider(sliderPosition, minimumValue, maximumValue, exponent) {
        const minimumSliderValue = 0;
        const maximumSliderValue = 100;
        const coefficient = sliderPosition / (maximumSliderValue - minimumSliderValue);
        const modifiedCoefficient = coefficient ** exponent;

        return SimParameters.linearInterpolate(minimumValue, maximumValue, modifiedCoefficient);
    }

    timeStepHasChanged() {
        return this.lastTimeStepSliderVal !== this.timeStepSliderVal;
    }

    getTimeStepUpdate() {
        let updates = {};
        if (this.timeStepHasChanged()) {
            this.lastTimeStepSliderVal = this.timeStepSliderVal;
            const newTimeStep = SimParameters.exponentialSlider(
                this.timeStepSliderVal,
                this.minimumTimeStep,
                this.maximumTimeStep,
                this.timeStepSliderExponent,
            );

            updates = {
                val: newTimeStep,
                sliderVal: this.timeStepSliderVal,
            };
        }

        return updates;
    }

    getRateParameterUpdates() {
        const updates = {};

        Object.keys(this.paramList).forEach((paramName) => {
            const currentSliderValue = this.paramList[paramName].val;
            const previousSliderValue = this.paramListCache[paramName];

            if (currentSliderValue !== previousSliderValue) {
                this.paramListCache[paramName] = currentSliderValue;

                const { paramList } = this;
                const newParamValue = SimParameters.exponentialSlider(
                    currentSliderValue,
                    paramList[paramName].min,
                    paramList[paramName].max,
                    32,
                );

                updates[paramName] = {
                    val: newParamValue,
                    sliderVal: currentSliderValue,
                };
            }
        });

        return updates;
    }

    /**
    * Parameter Update from backend (forwarding from other clients)
    */
    setParametersFromModel(model) {
        this.paramList = {};

        const { reactions } = model;
        Object.keys(reactions).forEach((index) => {
            const rxname = reactions[index].name;
            const rx = reactions[index];
            this.paramList[rxname] = {};
            this.paramList[rxname].val = 0;
            this.paramList[rxname].min = reactions[index].rate;
            this.paramList[rxname].max = reactions[index].rate * 1e30;
            this.paramListCache[rxname] = 0;

            const hasReverseRate = Object.prototype.hasOwnProperty.call(rx, 'reverse-rate');
            if (hasReverseRate) {
                const revName = `rev_${rxname}`;
                this.paramList[revName] = {};
                this.paramList[revName].val = 0;
                this.paramList[revName].min = reactions[index]['reverse-rate'];
                this.paramList[revName].max = reactions[index]['reverse-rate'] * 1e30;
                this.paramListCache[revName] = 0;
            }
        });

        this.minimumTimeStep = model.parameters['min-timestep'];
        this.maximumTimeStep = model.parameters['max-timestep'];
        this.timeStepSliderExponent = model.parameters['timestep-edit-exponent'];
        this.lastTimeStepSliderVal = -1; // flag for update
        this.guiNeedsUpdate = true;
    }
}

export { SimParameters };
export default SimParameters;
