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

export const AWAITING_SMOLDYN_SIM_RUN = "awaiting_smoldyn_sim_run";
export const AWAITING_CONVERSION = "awaiting_conversion";

/**
 * to do:
 * work out type of sendUpdate messages per simulator
 * client specific controls and other configuration
 */

export interface TrajectoryOptions {
    id: string;
    name: string;
    clientSimulator?: boolean;
    remoteClientSimulator?: boolean;
    networkedTrajectory?: boolean;
}

export const TRAJECTORY_OPTIONS: TrajectoryOptions[] = [
    {
        id: "test_live_mode",
        name: "test_live_mode",
        remoteClientSimulator: true,
        networkedTrajectory: true,
    },
    { id: "actin012_3.h5", name: "actin012_3.h5", networkedTrajectory: true },
    {
        id: "listeria_rocketbugs_normal_fine_2_filtered.simularium",
        name: "listeria",
        networkedTrajectory: true,
    },
    {
        id: "kinesin002_01.h5",
        name: "kinesin002_01.h5",
        networkedTrajectory: true,
    },
    {
        id: "microtubules038_10.h5",
        name: "microtubules038_10.h5",
        networkedTrajectory: true,
    },
    {
        id: "microtubules_v2_shrinking.h5",
        name: "microtubules_v2_shrinking.h5",
        networkedTrajectory: true,
    },
    { id: "aster.cmo", name: "aster.cmo", networkedTrajectory: true },
    {
        id: "microtubules30_1.h5",
        name: "microtubules",
        networkedTrajectory: true,
    },
    {
        id: "endocytosis.simularium",
        name: "Actin in Clathrin-mediated Endocytosis",
        networkedTrajectory: true,
    },
    {
        id: "pc4covid19.simularium",
        name: "SARS-CoV-2 Dynamics in Human Lung Epithelium",
        networkedTrajectory: true,
    },
    {
        id: "nanoparticle_wrapping.simularium",
        name: "Membrane Wrapping a Nanoparticle",
        networkedTrajectory: true,
    },
    {
        id: "smoldyn_min1.simularium",
        name: "Spatiotemporal oscillations in the E. coli Min system",
        networkedTrajectory: true,
    },
    {
        id: "smoldyn_spine.simularium",
        name: "Sequestration of CaMKII in dendritic spines",
        networkedTrajectory: true,
    },
    {
        id: "medyan_Chandrasekaran_2019_UNI_alphaA_0.1_MA_0.675.simularium",
        name: "Actin Bundle Dynamics with α–Actinin and Myosin",
        networkedTrajectory: true,
    },
    {
        id: "medyan_Chandrasekaran_2019_UNI_alphaA_0.1_MA_0.0225.simularium",
        name: "Actin Bundle Dynamics with α–Actinin and Myosin",
        networkedTrajectory: true,
    },
    {
        id: "springsalad_condensate_formation_Below_Ksp.simularium",
        name: "Condensate Formation",
        networkedTrajectory: true,
    },
    {
        id: "springsalad_condensate_formation_At_Ksp.simularium",
        name: "Condensate Formation",
        networkedTrajectory: true,
    },
    {
        id: "springsalad_condensate_formation_Above_Ksp.simularium",
        name: "Condensate Formation",
        networkedTrajectory: true,
    },
    {
        id: "blood-plasma-1.0.simularium",
        name: "Blood Plasma",
        networkedTrajectory: true,
    },
    { id: "TEST_POINTS", name: "Point Simulation", clientSimulator: true },
    {
        id: "TEST_LIVEMODE_API",
        name: "Point Simulation LIVE",
        clientSimulator: true,
    },
    { id: "TEST_BINDING", name: "Binding Simulation", clientSimulator: true },
    { id: "TEST_FIBERS", name: "Fiber Simulation", clientSimulator: true },
    { id: "TEST_SINGLE_FIBER", name: "Single Fiber", clientSimulator: true },
    { id: "TEST_PDB", name: "PDB Simulation", clientSimulator: true },
    { id: "TEST_SINGLE_PDB", name: "Single PDB", clientSimulator: true },
    { id: "TEST_METABALLS", name: "Metaballs", clientSimulator: true },
    { id: "TEST_VALUE_SPHERES", name: "Value Spheres", clientSimulator: true },
    { id: "DEBUG_SIM", name: "Debug Simulation", clientSimulator: true },
];
