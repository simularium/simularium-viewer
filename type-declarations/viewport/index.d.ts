import React from 'react';
import PropTypes from 'prop-types';
interface Viewport {
    visGeometry: any;
    visData: any;
    simParameters: any;
    netConnection: any;
    devGUI: any;
    devGuiRef: any;
    vdomRef: any;
    lastRenderTime: any;
    animate: any;
}
interface ViewportProps {
    height: number;
    width: number;
    devgui: any;
}
declare class Viewport extends React.Component<ViewportProps, {}> {
    constructor(props: ViewportProps);
    static readonly propTypes: {
        devgui: PropTypes.Requireable<boolean>;
        width: PropTypes.Requireable<number>;
        height: PropTypes.Requireable<number>;
    };
    componentDidMount(): void;
    drawDevGui(): JSX.Element;
    render(): JSX.Element;
}
export default Viewport;
