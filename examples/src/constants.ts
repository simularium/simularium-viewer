export const agentColors: string[] = [
    "#fee34d",
    "#f7b232",
    "#bf5736",
    "#94a7fc",
    "#ce8ec9",
    "#58606c",
    "#0ba345",
    "#9267cb",
    "#81dbe6",
    "#bd7800",
    "#bbbb99",
    "#5b79f0",
    "#89a500",
    "#da8692",
    "#418463",
    "#9f516c",
    "#00aabf",
];

/**
 * to do:
 * work out type of sendUpdate messages per simulator
 * client specific controls and other configuration
 */
export enum SimulatorModes {
    remotePrecomputed = "remotePrecomputed",
    localPrecomputed = "localPrecomputed",
    remoteClientSimulator = "remoteClientSimulator",
    localClientSimulator = "localClientSimulator",
}

export interface TrajectoryOptions {
    id: string;
    name: string;
    simulatorType: SimulatorModes;
}

export const TRAJECTORY_OPTIONS: TrajectoryOptions[] = [
    {
        id: "test_live_mode",
        name: "Brownian Motion LIVE (Octopus)",
        simulatorType: SimulatorModes.remoteClientSimulator,
    },
    {
        id: "actin012_3.h5",
        name: "actin012_3.h5",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "listeria_rocketbugs_normal_fine_2_filtered.simularium",
        name: "listeria",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "kinesin002_01.h5",
        name: "kinesin002_01.h5",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "microtubules038_10.h5",
        name: "microtubules038_10.h5",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "microtubules_v2_shrinking.h5",
        name: "microtubules_v2_shrinking.h5",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "aster.cmo",
        name: "aster.cmo",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "microtubules30_1.h5",
        name: "microtubules",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "endocytosis.simularium",
        name: "Actin in Clathrin-mediated Endocytosis",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "pc4covid19.simularium",
        name: "SARS-CoV-2 Dynamics in Human Lung Epithelium",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "nanoparticle_wrapping.simularium",
        name: "Membrane Wrapping a Nanoparticle",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "smoldyn_min1.simularium",
        name: "Spatiotemporal oscillations in the E. coli Min system",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "smoldyn_spine.simularium",
        name: "Sequestration of CaMKII in dendritic spines",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "medyan_Chandrasekaran_2019_UNI_alphaA_0.1_MA_0.675.simularium",
        name: "Actin Bundle Dynamics with α–Actinin and Myosin",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "medyan_Chandrasekaran_2019_UNI_alphaA_0.1_MA_0.0225.simularium",
        name: "Actin Bundle Dynamics with α–Actinin and Myosin",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "springsalad_condensate_formation_Below_Ksp.simularium",
        name: "Condensate Formation",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "springsalad_condensate_formation_At_Ksp.simularium",
        name: "Condensate Formation",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "springsalad_condensate_formation_Above_Ksp.simularium",
        name: "Condensate Formation",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "blood-plasma-1.0.simularium",
        name: "Blood Plasma",
        simulatorType: SimulatorModes.remotePrecomputed,
    },
    {
        id: "TEST_POINTS",
        name: "Point Simulation",
        simulatorType: SimulatorModes.localClientSimulator,
    },
    {
        id: "TEST_LIVEMODE_API",
        name: "Point Simulation LIVE",
        simulatorType: SimulatorModes.localClientSimulator,
    },
    {
        id: "TEST_BINDING",
        name: "Binding Simulation",
        simulatorType: SimulatorModes.localClientSimulator,
    },
    {
        id: "TEST_FIBERS",
        name: "Fiber Simulation",
        simulatorType: SimulatorModes.localClientSimulator,
    },
    {
        id: "TEST_SINGLE_FIBER",
        name: "Single Fiber",
        simulatorType: SimulatorModes.localClientSimulator,
    },
    {
        id: "TEST_PDB",
        name: "PDB Simulation",
        simulatorType: SimulatorModes.localClientSimulator,
    },
    {
        id: "TEST_SINGLE_PDB",
        name: "Single PDB",
        simulatorType: SimulatorModes.localClientSimulator,
    },
    {
        id: "TEST_METABALLS",
        name: "Metaballs",
        simulatorType: SimulatorModes.localClientSimulator,
    },
];
