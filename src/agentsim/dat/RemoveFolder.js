import { GUI } from "dat.gui";

GUI.prototype.removeFolder = function (name) {
    const folder = this.__folders[name];
    if (!folder) {
        return;
    }
    folder.close();
    this.__ul.removeChild(folder.domElement.parentNode);
    delete this.__folders[name];
    this.onResize();
};
